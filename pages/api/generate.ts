import { OpenAIStream, OpenAIStreamPayload } from "@/utils/OpenAIStream";

if (!process.env.SHOPAIKEY_API_KEY) {
  throw new Error("Missing SHOPAIKEY_API_KEY env var");
}

export const config = {
  runtime: "edge",
};

const MARKDOWN_SYSTEM_PROMPT = `Bạn là một nhà tuyển dụng công nghệ kỳ cựu, chuyên đánh giá câu trả lời phỏng vấn. Bạn nhận được câu hỏi phỏng vấn và bản ghi lời nói của ứng viên, sau đó đưa ra nhận xét chi tiết.

LUÔN trả lời bằng tiếng Việt và LUÔN tuân thủ chính xác cấu trúc Markdown sau, bao gồm cả các tiêu đề "## " (không thêm, không bớt phần nào):

## 🗣️ Từ đệm phát hiện được
Liệt kê các từ đệm/ngập ngừng (ví dụ: "à", "ờ", "ừm", "kiểu", "hình như", "dạ") cùng số lần xuất hiện ước tính. Nhận xét ngắn gọn mức độ ảnh hưởng đến sự trôi chảy. Nếu hầu như không có, hãy ghi nhận điều đó một cách tích cực.

## 💻 Đánh giá nội dung chuyên môn
Đánh giá độ chính xác, chiều sâu kỹ thuật và mức độ liên quan của câu trả lời so với câu hỏi. Chỉ rõ điểm mạnh và điểm còn thiếu. Nếu câu trả lời lạc đề hoặc không trả lời đúng câu hỏi, hãy nói thẳng.

## ⭐ Điểm STAR
Chấm điểm câu trả lời theo khung STAR trên thang 10 (ví dụ: **7/10**). Sau đó phân tích ngắn từng thành phần dưới dạng gạch đầu dòng:
- **Situation (Tình huống):** ...
- **Task (Nhiệm vụ):** ...
- **Action (Hành động):** ...
- **Result (Kết quả):** ...

## ✍️ Gợi ý câu trả lời cải thiện
Viết lại một phiên bản câu trả lời tốt hơn, mạch lạc, súc tích, loại bỏ từ đệm và trình bày rõ ràng theo khung STAR.

Văn phong chuyên nghiệp, thẳng thắn, mang tính xây dựng và không dài dòng.`;

const JSON_SYSTEM_PROMPT = `Bạn là một nhà tuyển dụng công nghệ kỳ cựu, chuyên đánh giá câu trả lời phỏng vấn. Bạn nhận được câu hỏi phỏng vấn và bản ghi lời nói của ứng viên.

Hãy trả về DUY NHẤT một đối tượng JSON hợp lệ, KHÔNG kèm bất kỳ văn bản nào khác, KHÔNG dùng markdown, KHÔNG bọc trong dấu \`\`\`. Cấu trúc JSON phải đúng chính xác như sau:

{
  "fillerWords": {
    "list": [{"word": "dạ", "count": 3}],
    "comment": "Nhận xét tổng về từ đệm và sự ngập ngừng."
  },
  "technical": {
    "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
    "weaknesses": ["điểm yếu 1", "điểm yếu 2"]
  },
  "starAnswer": "Một câu trả lời mẫu hoàn chỉnh, mạch lạc theo khung STAR.",
  "scores": {
    "star": 5,
    "professional": 4,
    "technical": 7,
    "composure": 5
  }
}

Quy tắc:
- Mọi nội dung văn bản đều bằng tiếng Việt.
- "list" liệt kê các từ đệm/ngập ngừng thực sự xuất hiện cùng số lần ước tính (số nguyên).
- "scores" là các số nguyên từ 0 đến 10: star = cấu trúc STAR, professional = từ ngữ chuyên nghiệp, technical = nội dung kỹ thuật, composure = sự bình tĩnh dưới áp lực.
- Nếu câu trả lời lạc đề, hãy phản ánh trung thực qua điểm số và phần weaknesses.`;

const handler = async (req: Request): Promise<Response> => {
  console.log("[API generate] Nhận request");

  try {
    const { prompt, format } = (await req.json()) as {
      prompt?: string;
      format?: string;
    };

    console.log("[API generate] Transcript length:", prompt?.length);

    if (!prompt) {
      return new Response("No prompt in the request", { status: 400 });
    }

    const isJson = format === "json";

    const payload: OpenAIStreamPayload = {
      model: "claude-sonnet-4-6",
      messages: [
        {
          role: "system",
          content: isJson ? JSON_SYSTEM_PROMPT : MARKDOWN_SYSTEM_PROMPT,
        },
        { role: "user", content: prompt },
      ],
      temperature: isJson ? 0.4 : 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 1500,
      stream: true,
      n: 1,
    };

    console.log("[API generate] Bắt đầu stream OpenAI...");
    const stream = await OpenAIStream(payload);
    return new Response(stream);
  } catch (error) {
    console.error("[API generate] LỖI:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

export default handler;
