import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * AI 简历-职位匹配服务
 *
 * 三种模式：
 *   { mode: "single", candidateId }          — 单个候选人 vs 其应聘职位
 *   { mode: "batch-job", jobId }             — 批量筛选某个职位下所有候选人
 *   { mode: "batch-all" }                    — 全量匹配所有候选人 vs 所有开放职位
 *
 * 环境变量 ANTHROPIC_API_KEY 控制是否启用 Claude AI
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const mode = body.mode || "single";
  const tenantId = session.user.tenantId;

  // ─── Batch-Job: screen all candidates for one job ───
  if (mode === "batch-job") {
    const { jobId } = body;
    if (!jobId) return NextResponse.json({ error: "缺少 jobId" }, { status: 400 });

    const job = await prisma.jobPosting.findFirst({
      where: { id: jobId, tenantId },
      include: { department: { select: { name: true } }, position: { select: { name: true } } },
    });
    if (!job) return NextResponse.json({ error: "职位未找到" }, { status: 404 });

    const candidates = await prisma.candidate.findMany({
      where: { jobId, tenantId },
      orderBy: { rating: "desc" },
    });

    const jobReq = buildJobProfile(job);
    const results = await Promise.all(
      candidates.map(async (c) => ({
        candidateId: c.id,
        candidateName: c.name,
        ...(await matchSingle(buildCandidateProfile(c), jobReq)),
      }))
    );

    results.sort((a, b) => b.score - a.score);
    return NextResponse.json({ mode, jobTitle: job.title, total: results.length, results });
  }

  // ─── Batch-All: full screening ───
  if (mode === "batch-all") {
    const jobs = await prisma.jobPosting.findMany({
      where: { tenantId, status: "OPEN" },
      include: { department: { select: { name: true } }, position: { select: { name: true } } },
    });

    if (jobs.length === 0) return NextResponse.json({ error: "没有开放职位" }, { status: 400 });

    const allResults: any[] = [];
    for (const job of jobs) {
      const candidates = await prisma.candidate.findMany({
        where: { jobId: job.id, tenantId },
      });
      const jobReq = buildJobProfile(job);
      for (const c of candidates) {
        const r = await matchSingle(buildCandidateProfile(c), jobReq);
        allResults.push({ candidateId: c.id, candidateName: c.name, jobTitle: job.title, ...r });
      }
    }

    allResults.sort((a, b) => b.score - a.score);
    return NextResponse.json({ mode, total: allResults.length, results: allResults });
  }

  // ─── Single: default mode ───
  const { candidateId } = body;
  if (!candidateId) return NextResponse.json({ error: "缺少 candidateId" }, { status: 400 });

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, tenantId },
    include: {
      jobPosting: {
        include: { department: { select: { name: true } }, position: { select: { name: true } } },
      },
    },
  });
  if (!candidate) return NextResponse.json({ error: "候选人未找到" }, { status: 404 });

  const result = await matchSingle(
    buildCandidateProfile(candidate),
    buildJobProfile(candidate.jobPosting)
  );
  return NextResponse.json({ mode, candidateId, candidateName: candidate.name, ...result });
}

// ─── Helpers ───

function buildCandidateProfile(c: any) {
  return {
    name: c.name,
    phone: c.phone || "未提供",
    email: c.email || "未提供",
    source: c.source || "未知渠道",
    notes: c.notes || "",
    rating: c.rating || 0,
  };
}

function buildJobProfile(job: any) {
  return {
    title: job.title,
    department: job.department?.name || "",
    position: job.position?.name || "",
    description: job.description || "",
    requirements: job.requirements || "",
    salaryMin: job.salaryMin || 0,
    salaryMax: job.salaryMax || 0,
    headcount: job.headcount,
  };
}

async function matchSingle(
  candidate: any,
  job: any
): Promise<{ method: string; score: number; summary: string; details: any; hint?: string }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return {
      method: "rule-based",
      hint: "设置 ANTHROPIC_API_KEY 可获得 AI 智能匹配",
      ...ruleBasedMatch(candidate, job),
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system:
          "你是资深招聘顾问。分析候选人是否匹配职位要求，返回 JSON：{score:0-100,summary:string,details:{skills:string,experience:string,fit:string,recommendation:string}}。基于候选人备注、评分、来源渠道及职位要求综合判断。不要 markdown 标记。",
        messages: [
          { role: "user", content: `候选人：${JSON.stringify(candidate)}\n职位：${JSON.stringify(job)}\n分析匹配度。` },
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const text = data.content[0]?.text || "";
    let result;
    try {
      result = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
    } catch {
      const scoreMatch = text.match(/score["\s:]+(\d+)/i);
      result = {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
        summary: text.slice(0, 200),
        details: { skills: "", experience: "", fit: "", recommendation: text },
      };
    }
    return { method: "ai", ...result };
  } catch {
    return { method: "rule-based", hint: "AI 暂时不可用，显示规则匹配", ...ruleBasedMatch(candidate, job) };
  }
}

function ruleBasedMatch(candidate: any, job: any) {
  let score = 30;
  const skills: string[] = [];
  const experience: string[] = [];
  const fit: string[] = [];

  if (candidate.rating >= 4) { score += 20; fit.push("评分较高"); }
  else if (candidate.rating >= 3) score += 10;

  if (candidate.phone && candidate.email) { score += 10; skills.push("联系方式完整"); }
  if (candidate.phone) skills.push("有手机号");
  if (candidate.email) skills.push("有邮箱");

  if (candidate.source === "NEITUI") { score += 15; fit.push("内推高质量"); }
  else if (candidate.source === "LIEPA") { score += 10; fit.push("猎聘渠道"); }

  if (candidate.notes && candidate.notes.length > 30) { score += 10; experience.push("有详细备注"); }
  if (candidate.notes && candidate.notes.length > 100) { score += 5; experience.push("备注丰富"); }

  // Keyword matching: notes vs requirements
  if (candidate.notes && job.requirements) {
    const reqKeywords = job.requirements.toLowerCase().split(/[,，、\s]+/).filter((w: string) => w.length > 1);
    const matchCount = reqKeywords.filter((kw: string) => candidate.notes.toLowerCase().includes(kw)).length;
    if (matchCount > 5) { score += 15; skills.push(`匹配 ${matchCount} 个技能关键词`); }
    else if (matchCount > 2) { score += 8; skills.push(`匹配 ${matchCount} 个技能关键词`); }
    else if (matchCount > 0) { score += 3; skills.push("部分关键词匹配"); }
  }

  if (job.salaryMax > 30000) { score -= 5; fit.push("高级职位，竞争较高"); }
  if (job.headcount > 1) fit.push(`招${job.headcount}人`);

  score = Math.min(100, Math.max(0, score));
  const level = score >= 80 ? "优秀" : score >= 60 ? "良好" : score >= 40 ? "一般" : "较低";

  return {
    score,
    summary: `${score} 分（${level}）`,
    details: {
      skills: skills.join("；") || "暂无匹配技能",
      experience: experience.join("；") || "暂无经验分析",
      fit: fit.join("；") || "基本匹配",
      recommendation:
        score >= 80 ? "强烈推荐安排面试" : score >= 60 ? "建议安排面试" : score >= 40 ? "可考虑了解" : "建议暂缓",
    },
  };
}
