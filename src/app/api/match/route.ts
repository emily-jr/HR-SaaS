import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// AI Resume-to-Job matching
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const { candidateId } = body;

  // 1. Load candidate with their job posting
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, tenantId: session.user.tenantId },
    include: {
      jobPosting: {
        include: {
          department: { select: { name: true } },
          position: { select: { name: true } },
        },
      },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "候选人未找到" }, { status: 404 });
  }

  const job = candidate.jobPosting;

  // 2. Build candidate profile from available fields
  const candidateProfile = {
    name: candidate.name,
    phone: candidate.phone || "未提供",
    email: candidate.email || "未提供",
    source: candidate.source || "未知渠道",
    notes: candidate.notes || "",
    rating: candidate.rating || 0,
  };

  // 3. Build job requirements
  const jobRequirements = {
    title: job.title,
    department: job.department?.name || "",
    position: job.position?.name || "",
    description: job.description || "",
    requirements: job.requirements || "",
    salaryMin: job.salaryMin || 0,
    salaryMax: job.salaryMax || 0,
    headcount: job.headcount,
  };

  // 4. AI-powered matching using Anthropic Claude
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    // Fallback: rule-based matching when no AI key
    const ruleScore = ruleBasedMatch(candidateProfile, jobRequirements);
    return NextResponse.json({
      method: "rule-based",
      score: ruleScore.score,
      summary: ruleScore.summary,
      details: ruleScore.details,
      hint: "设置 ANTHROPIC_API_KEY 环境变量可获得 AI 智能匹配",
    });
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
          "你是一位专业的招聘顾问。根据候选人信息和职位要求，给出匹配度评分(0-100)、摘要和详细分析。返回纯 JSON，格式：{score:number,summary:string,details:{skills:string,experience:string,fit:string,recommendation:string}}。不要包含 markdown 代码块标记。",
        messages: [
          {
            role: "user",
            content: `候选人信息：${JSON.stringify(candidateProfile, null, 2)}\n\n职位要求：${JSON.stringify(jobRequirements, null, 2)}\n\n请分析匹配度。`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const text = data.content[0]?.text || "";

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
    } catch {
      // If JSON parse fails, extract score manually
      const scoreMatch = text.match(/score["\s:]+(\d+)/i);
      result = {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
        summary: text.slice(0, 200),
        details: { skills: "", experience: "", fit: "", recommendation: text },
      };
    }

    return NextResponse.json({
      method: "ai",
      ...result,
    });
  } catch (error) {
    // Fallback to rule-based on AI failure
    const ruleScore = ruleBasedMatch(candidateProfile, jobRequirements);
    return NextResponse.json({
      method: "rule-based",
      score: ruleScore.score,
      summary: ruleScore.summary,
      details: ruleScore.details,
      hint: "AI 服务暂时不可用，显示规则匹配结果",
    });
  }
}

// Rule-based matching fallback
function ruleBasedMatch(
  candidate: any,
  job: any
): { score: number; summary: string; details: any } {
  let score = 30; // base score

  const details: string[] = [];
  const skills: string[] = [];
  const experience: string[] = [];
  const fit: string[] = [];

  // Rating boost
  if (candidate.rating >= 4) {
    score += 20;
    fit.push("候选人评分较高");
  } else if (candidate.rating >= 3) {
    score += 10;
  }

  // Contact info completeness
  if (candidate.phone && candidate.email) {
    score += 10;
    skills.push("联系方式完整");
  }
  if (candidate.email) {
    skills.push("有邮箱");
  }
  if (candidate.phone) {
    skills.push("有手机号");
  }

  // Source quality
  if (candidate.source === "NEITUI") {
    score += 15;
    fit.push("内推渠道质量较高");
  } else if (candidate.source === "LIEPA") {
    score += 10;
    fit.push("猎聘渠道");
  }

  // Notes indicate experience
  if (candidate.notes && candidate.notes.length > 30) {
    score += 10;
    experience.push("有详细备注信息");
  }
  if (candidate.notes && candidate.notes.length > 100) {
    score += 5;
    experience.push("备注内容丰富");
  }

  // Job salary range indicates seniority
  if (job.salaryMax > 30000) {
    score -= 5;
    fit.push("高级职位，竞争激烈");
  }

  // Has headcount
  if (job.headcount > 1) {
    fit.push(`招聘${job.headcount}人，机会较大`);
  }

  // Cap score
  score = Math.min(100, Math.max(0, score));

  const level = score >= 80 ? "优秀" : score >= 60 ? "良好" : score >= 40 ? "一般" : "较低";

  return {
    score,
    summary: `匹配度 ${score} 分（${level}）`,
    details: {
      skills: skills.join("；") || "待补充",
      experience: experience.join("；") || "待补充",
      fit: fit.join("；") || "基本匹配",
      recommendation:
        score >= 80
          ? "强烈推荐安排面试"
          : score >= 60
            ? "建议安排面试"
            : score >= 40
              ? "可考虑进一步了解"
              : "匹配度较低，建议暂缓",
    },
  };
}
