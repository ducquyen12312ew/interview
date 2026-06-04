import { OpenAIStream, OpenAIStreamPayload } from "@/utils/OpenAIStream";

if (!process.env.SHOPAIKEY_API_KEY) {
  throw new Error("Missing SHOPAIKEY_API_KEY env var");
}

export const config = {
  runtime: "edge",
};

const handler = async (req: Request): Promise<Response> => {
  const { prompt } = (await req.json()) as {
    prompt?: string;
  };

  if (!prompt) {
    return new Response("No prompt in the request", { status: 400 });
  }

  const payload: OpenAIStreamPayload = {
    model: "claude-sonnet-4-6",
    messages: [
      {
        role: "system",
        content:
          "Bạn là một nhà tuyển dụng công nghệ kỳ cựu. Nhiệm vụ của bạn là đưa ra nhận xét về câu trả lời phỏng vấn của ứng viên dựa trên bản ghi âm. Nếu câu trả lời không liên quan hoặc không trả lời đúng câu hỏi, hãy chỉ ra điều đó rõ ràng. Không dài dòng, hãy tập trung vào chất lượng câu trả lời của ứng viên. Luôn trả lời bằng tiếng Việt.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 600,
    stream: true,
    n: 1,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;
