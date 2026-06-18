import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { log } from "../utils/logger";

type Phase = "waiting" | "playing" | "done";

const QUESTION =
  "Hãy kể về một lần dự án IT của bạn gặp lỗi nghiêm trọng (bug/sự cố) ngay sát giờ ra mắt (release). Bạn đã xử lý thế nào?";

const TRANSCRIPT = `Dạ, có một lần lúc em làm deploy dự án web cuối kỳ. Còn khoảng 2 tiếng nữa là đến giờ demo với thầy thì API bị crash liên tục, không fetch được dữ liệu từ database lên.

Lúc đó em khá lo, vì code chạy trên máy localhost ngon lành mà lên server lại lỗi. Em nhảy vào đọc log server thì thấy lỗi kết nối — thì ra lúc config biến môi trường trên server bị gõ sai một ký tự.

Em sửa lại config, deploy lại. Hệ thống chạy bình thường trước giờ demo khoảng 15 phút.`;

const STAR_ANSWER =
  "Trong một dự án web gần đây, ngay trước giờ release 2 tiếng, hệ thống Production bất ngờ gặp sự cố sập API và không thể kết nối cơ sở dữ liệu, dù ở môi trường Local vẫn chạy tốt. Thay vì hoảng loạn, em lập tức truy cập vào hệ thống giám sát để kiểm tra log server. Em phát hiện nguyên nhân là do sai lệch cấu hình biến môi trường (Environment Variables) giữa hai môi trường. Em đã phối hợp với team để cập nhật lại file config, tiến hành test nhanh trên môi trường Staging để đảm bảo an toàn, sau đó mới deploy lại lên Production. Hệ thống hoạt động ổn định trở lại trước giờ ra mắt 15 phút.";

const SCORES = [
  { label: "Cấu trúc STAR", value: 5, color: "bg-blue-500" },
  { label: "Từ ngữ chuyên nghiệp", value: 4, color: "bg-orange-500" },
  { label: "Nội dung kỹ thuật", value: 7, color: "bg-green-500" },
  { label: "Bình tĩnh & áp lực", value: 5, color: "bg-yellow-400" },
];
const TOTAL = SCORES.reduce((sum, s) => sum + s.value, 0); // 21

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm font-medium text-gray-200 mb-1">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-700">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function StreamingText({
  text,
  onDone,
}: {
  text: string;
  onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    setDisplayed("");
    doneRef.current = false;

    // Chia thành các chunk tự nhiên theo cụm từ
    const words = text.split(" ");
    const chunks: string[] = [];
    let i = 0;
    while (i < words.length) {
      const size = Math.floor(Math.random() * 4) + 2; // 2-5 từ mỗi chunk
      chunks.push(words.slice(i, i + size).join(" "));
      i += size;
    }

    let chunkIndex = 0;
    let accumulated = "";
    let timer: ReturnType<typeof setTimeout>;

    const next = () => {
      if (chunkIndex >= chunks.length) {
        doneRef.current = true;
        onDone?.();
        return;
      }

      const chunk = chunks[chunkIndex];
      accumulated += (accumulated ? " " : "") + chunk;
      setDisplayed(accumulated);
      chunkIndex++;

      // Delay ngẫu nhiên: thỉnh thoảng dừng lâu hơn (giả lập "đang suy nghĩ")
      const isPause = Math.random() < 0.15; // 15% chance dừng lâu
      const delay = isPause
        ? Math.random() * 600 + 400 // 400-1000ms
        : Math.random() * 80 + 40; // 40-120ms bình thường

      timer = setTimeout(next, delay);
    };

    // Bắt đầu sau 300ms
    timer = setTimeout(next, 300);

    return () => {
      doneRef.current = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <p className="prose prose-sm max-w-none leading-7 text-gray-700 whitespace-pre-line">
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[0.9em] bg-gray-400 ml-[2px] animate-pulse align-middle opacity-70" />
      )}
    </p>
  );
}

export default function SecretDemoPage() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [analysisStep, setAnalysisStep] = useState(0);
  // 0 = chưa bắt đầu
  // 1 = đang xử lý (spinner)
  // 2 = hiện transcript
  // 3 = hiện card 1 (từ đệm)
  // 4 = hiện card 2 (kỹ thuật)
  // 5 = hiện card 3 (STAR)
  // 6 = hiện card 4 (điểm số)
  const [videoEnded, setVideoEnded] = useState(false);
  const [seconds, setSeconds] = useState(150);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showControls, setShowControls] = useState(false);
  // true khi video Sarah kết thúc và user đã bấm dừng
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("Đang xử lý");
  const [transcriptDone, setTranscriptDone] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<Webcam | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    log.page("Secret Demo", { mode: "hardcoded" });
  }, []);

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
  }, []);

  // Countdown begins once Sarah's video has finished playing.
  useEffect(() => {
    if (phase !== "playing" || !videoEnded || showControls) return;
    if (seconds <= 0) {
      setShowControls(true);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, videoEnded, seconds, showControls]);

  // Bắt đầu record webcam khi Sarah's video kết thúc.
  useEffect(() => {
    if (!videoEnded || phase !== "playing") return;

    const stream = webcamRef.current?.stream;
    if (!stream) return;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    const chunks: Blob[] = [];
    recorder.addEventListener("dataavailable", ({ data }: BlobEvent) => {
      if (data.size > 0) chunks.push(data);
    });
    recorder.addEventListener("stop", () => {
      setRecordedChunks(chunks);
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    });

    recorder.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoEnded, phase]);

  // Dọn dẹp Object URL khi unmount / khi URL thay đổi.
  useEffect(() => {
    return () => {
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    };
  }, [recordedVideoUrl]);

  // Sau khi transcript stream xong, hiện cards với delay tự nhiên.
  useEffect(() => {
    if (!transcriptDone) return;
    const t3 = setTimeout(() => setAnalysisStep(3), 800);
    const t4 = setTimeout(() => setAnalysisStep(4), 2000);
    const t5 = setTimeout(() => setAnalysisStep(5), 3400);
    const t6 = setTimeout(() => setAnalysisStep(6), 4800);
    return () => {
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [transcriptDone]);

  // First red-button click: play Sarah's video (with sound).
  const handleStart = () => {
    log.action("Secret Demo: Bắt đầu phát video Sarah");
    setPhase("playing");
    setTimeout(() => {
      vidRef.current?.play().catch(() => {});
    }, 0);
  };

  // Second red-button click: stop. Dừng đếm ngược và hiện 2 nút bên dưới.
  const handleStop = () => {
    log.action("Secret Demo: Dừng — hiện nút phân tích");
    // Dừng MediaRecorder để chốt video đã record.
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setShowControls(true);
    // KHÔNG setPhase("done") ở đây — chỉ dừng đếm ngược, hiện 2 nút.
  };

  // Bấm "Phân tích câu trả lời" — giả lập các bước xử lý rồi hiện kết quả dần.
  const handleAnalyze = async () => {
    log.action("Secret Demo: Bắt đầu phân tích câu trả lời");
    setIsSubmitting(true);
    setStatus("Đang xử lý");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStatus("Đang nhận dạng giọng nói");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setPhase("done");
    setAnalysisStep(1);
    setTranscriptDone(false);

    // Bắt đầu stream transcript; cards sẽ xuất hiện sau khi transcript xong
    // (dựa vào transcriptDone -> useEffect, không dùng setTimeout cố định).
    setTimeout(() => setAnalysisStep(2), 300);
  };

  const videoConstraints = isDesktop
    ? { width: 1280, height: 720, facingMode: "user" }
    : { width: 480, height: 640, facingMode: "user" };

  const mmss = new Date(Math.max(seconds, 0) * 1000)
    .toISOString()
    .slice(14, 19);

  if (phase === "done") {
    // Trạng thái loading ban đầu: spinner toàn màn hình.
    if (analysisStep === 1) {
      return (
        <div className="w-full min-h-screen bg-[#FCFCFC] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="animate-spin h-8 w-8 text-[#407BBF]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth={3}
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-[#1D2B3A] font-medium">
              Đang xử lý câu trả lời...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full min-h-screen flex flex-col px-4 pt-2 pb-8 md:px-8 md:py-2 bg-[#FCFCFC]">
        <div className="w-full flex flex-col max-w-[1080px] mx-auto mt-[10vh] overflow-y-auto pb-8 md:pb-12">
          {/* Video player — video webcam đã record (fallback Sarah_v1.mp4) */}
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.35, ease: [0.075, 0.82, 0.165, 1] }}
            className="relative md:aspect-[16/9] w-full max-w-[1080px] overflow-hidden bg-[#1D2B3A] rounded-lg ring-1 ring-gray-900/5 shadow-md flex flex-col items-center justify-center"
          >
            <video
              className="w-full h-full rounded-lg"
              controls
              crossOrigin="anonymous"
              autoPlay
            >
              <source
                src={recordedVideoUrl ?? "/video/Sarah_v1.mp4"}
                type="video/mp4"
              />
            </video>
          </motion.div>

          {/* Lock icon + privacy note */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.15, ease: [0.23, 1, 0.82, 1] }}
            className="flex flex-row items-center space-x-1 mt-2 md:mt-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-[#407BBF] shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <p className="text-[14px] font-normal leading-[20px] text-[#1a2b3b]">
              Video không được lưu trên máy chủ và sẽ bị xóa ngay khi bạn rời khỏi trang.
            </p>
          </motion.div>

          {/* Transcript + AI feedback — dùng analysisStep để reveal từng phần */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.15, ease: [0.23, 1, 0.82, 1] }}
            className="mt-8 flex flex-col"
          >
            {/* Transcript */}
            {analysisStep >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-xl font-semibold text-left text-[#1D2B3A] mb-2">
                  Nội dung ghi âm
                </h2>
                <StreamingText
                  text={TRANSCRIPT}
                  onDone={() => setTranscriptDone(true)}
                />
              </motion.div>
            )}

            {/* AI feedback section */}
            {analysisStep >= 2 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-left text-[#1D2B3A] mb-2">
                  Nhận xét từ AI
                </h2>

                {/* Spinner chỉ hiện khi transcript đã xong nhưng card chưa có */}
                {transcriptDone && analysisStep < 3 && (
                  <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-[#EEEEEE] bg-[#FAFAFA] p-4 text-sm text-gray-600 min-h-[80px]">
                    <svg
                      className="animate-spin h-4 w-4 text-[#407BBF]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth={3}
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Đang phân tích câu trả lời của bạn...</span>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-4">
                  {/* Card 1 — từ đệm */}
                  {analysisStep >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-lg border border-gray-200 border-l-4 border-l-yellow-400 bg-white p-4 shadow-sm"
                    >
                      <h3 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#1D2B3A]">
                        <span>⚠️</span>
                        <span>Từ đệm &amp; Ngắt ngứ</span>
                      </h3>
                      <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mt-1 text-sm leading-6 text-gray-700"
                      >
                        <strong className="font-semibold text-[#1D2B3A]">
                          Sự thiếu nhất quán từ đầu:
                        </strong>{" "}
                        Câu &quot;hình như là lúc làm bài tập lớn... à không, lúc em
                        làm deploy...&quot; cho thấy ứng viên chưa định hình sẵn câu
                        chuyện trong đầu, vừa nói vừa nhớ nên bị lúng túng ngay từ giây
                        đầu tiên.
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="mt-2 text-sm leading-6 text-gray-700"
                      >
                        <strong className="font-semibold text-[#1D2B3A]">
                          Lặp từ đệm gây mất điểm:
                        </strong>{" "}
                        Các cụm từ <em>dạ, hình như là, à không, ờ, kiểu, xong rồi, thế
                        là</em> xuất hiện liên tục. Trong ngành IT, việc ngắt ngứ này
                        dễ khiến người phỏng vấn cảm giác bạn bị rối loạn/mất bình tĩnh
                        khi gặp sự cố production.
                      </motion.p>
                    </motion.div>
                  )}

                  {/* Card 2 — kỹ thuật */}
                  {analysisStep >= 4 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-lg border border-gray-200 border-l-4 border-l-blue-500 bg-white p-4 shadow-sm"
                    >
                      <h3 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#1D2B3A]">
                        <span>💻</span>
                        <span>Đánh giá nội dung kỹ thuật</span>
                      </h3>
                      <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mt-1 text-sm font-semibold text-green-700"
                      >
                        Điểm cộng ✅:
                      </motion.p>
                      <ul className="mt-1 flex flex-col gap-1">
                        <motion.li
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          className="flex gap-2 text-sm leading-6 text-gray-700"
                        >
                          <span className="shrink-0 text-green-600">•</span>
                          <span>
                            Lỗi &quot;chạy localhost ngon nhưng lên server lỗi&quot; và
                            &quot;sai biến môi trường (environment variables)&quot; là
                            tình huống cực kỳ thực tế trong ngành lập trình.
                          </span>
                        </motion.li>
                        <motion.li
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.35 }}
                          className="flex gap-2 text-sm leading-6 text-gray-700"
                        >
                          <span className="shrink-0 text-green-600">•</span>
                          <span>
                            Cách tiếp cận &quot;nhảy vào đọc log&quot; (check log)
                            chứng tỏ ứng viên có tư duy debug đúng hướng.
                          </span>
                        </motion.li>
                      </ul>
                      <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                        className="mt-3 text-sm font-semibold text-red-700"
                      >
                        Điểm trừ ❌:
                      </motion.p>
                      <ul className="mt-1 flex flex-col gap-1">
                        <motion.li
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.6 }}
                          className="flex gap-2 text-sm leading-6 text-gray-700"
                        >
                          <span className="shrink-0 text-red-500">•</span>
                          <span>
                            <strong className="font-semibold text-[#1D2B3A]">
                              Quá cảm tính:
                            </strong>{" "}
                            Dùng từ &quot;hoảng lắm&quot;. Khi hệ thống crash, nhà
                            tuyển dụng cần một cái đầu lạnh.
                          </span>
                        </motion.li>
                        <motion.li
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.75 }}
                          className="flex gap-2 text-sm leading-6 text-gray-700"
                        >
                          <span className="shrink-0 text-red-500">•</span>
                          <span>
                            <strong className="font-semibold text-[#1D2B3A]">
                              Thiếu quy trình an toàn:
                            </strong>{" "}
                            &quot;sửa lại rồi deploy lại luôn&quot; trực tiếp trên
                            server là hotfix production không qua staging — rủi ro cao.
                          </span>
                        </motion.li>
                      </ul>
                    </motion.div>
                  )}

                  {/* Card 3 — STAR */}
                  {analysisStep >= 5 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-lg border border-gray-200 border-l-4 border-l-green-500 bg-white p-4 shadow-sm"
                    >
                      <h3 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#1D2B3A]">
                        <span>⭐</span>
                        <span>Câu trả lời chuẩn theo STAR</span>
                      </h3>
                      <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mt-1 text-sm leading-6 text-gray-700"
                      >
                        {STAR_ANSWER}
                      </motion.p>
                    </motion.div>
                  )}

                  {/* Card 4 — điểm số */}
                  {analysisStep >= 6 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-lg border-l-4 border-l-purple-500 bg-[#1D2B3A] p-5 shadow-sm"
                    >
                      <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-white">
                        <span>📊</span>
                        <span>Điểm số đánh giá</span>
                      </h3>
                      <div className="flex flex-col gap-3">
                        {SCORES.map((s, index) => (
                          <motion.div
                            key={s.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.2 }}
                          >
                            <ScoreBar
                              label={s.label}
                              value={s.value}
                              color={s.color}
                            />
                          </motion.div>
                        ))}
                      </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.5 }}
                        className="mt-5 flex items-center justify-between border-t border-gray-700 pt-4"
                      >
                        <span className="text-base font-semibold text-white">
                          Tổng: {TOTAL}/40
                        </span>
                        <span className="text-lg font-bold text-orange-500">
                          Cần cải thiện
                        </span>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // "waiting" and "playing" share the same webcam layout.
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#FCFCFC] px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col">
        <h2 className="mb-4 text-2xl font-semibold text-[#1D2B3A]">
          {QUESTION}
        </h2>

        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#1D2B3A] shadow-md ring-1 ring-gray-900/5">
          {/* Countdown timer (top-left), shown once recording starts. */}
          {phase === "playing" && videoEnded && (
            <div className="absolute left-5 top-5 z-30 lg:left-10 lg:top-10">
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">
                {mmss}
              </span>
            </div>
          )}

          {/* User's webcam fills the frame. */}
          <Webcam
            mirrored
            audio={true}
            muted
            ref={webcamRef}
            videoConstraints={videoConstraints}
            className="absolute z-10 h-auto min-h-full w-auto min-w-full object-cover"
          />

          {/* Top-right box: static Sarah image (waiting) or her video (playing). */}
          <div className="absolute right-[10px] top-[10px] z-20 aspect-video h-[80px] overflow-hidden rounded-md sm:right-[20px] sm:top-[20px] sm:h-[140px] md:right-10 md:top-[40px] md:h-[180px] md:rounded-xl ring-1 ring-white/10">
            {phase === "playing" ? (
              <video
                ref={vidRef}
                autoPlay
                playsInline
                controls={false}
                onEnded={() => {
                  log.action("Secret Demo: Video Sarah kết thúc, hiện đếm ngược");
                  setVideoEnded(true);
                }}
                className="h-full w-full object-cover"
              >
                <source src="/video/Sarah_v1.mp4" type="video/mp4" />
              </video>
            ) : (
              <img
                src="/placeholders/Sarah.webp"
                alt="Sarah"
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Bottom-center control button. */}
          <div className="absolute bottom-5 left-0 z-30 flex w-full flex-col items-center justify-center gap-2">
            {phase === "waiting" && (
              <button
                onClick={handleStart}
                className="flex flex-col items-center gap-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 ring-4 ring-white transition active:scale-95" />
                <span className="rounded-full bg-black/40 px-3 py-1 text-sm font-medium text-white">
                  Bắt đầu
                </span>
              </button>
            )}

            {phase === "playing" && !videoEnded && (
              <button disabled className="flex cursor-not-allowed flex-col items-center gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-400 ring-4 ring-white" />
                <span className="rounded-full bg-black/40 px-3 py-1 text-sm font-medium text-white">
                  Sarah đang hỏi...
                </span>
              </button>
            )}

            {phase === "playing" && videoEnded && !showControls && (
              <button
                onClick={handleStop}
                className="flex flex-col items-center gap-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-transparent ring-4 ring-white transition active:scale-95">
                  <span className="h-5 w-5 rounded bg-red-500" />
                </span>
                <span className="rounded-full bg-black/40 px-3 py-1 text-sm font-medium text-white">
                  Dừng trả lời
                </span>
              </button>
            )}

            {showControls && (
              <div className="flex flex-row gap-2">
                {!isSubmitting && (
                  <button
                    onClick={() => {
                      log.action("Secret Demo: Làm lại");
                      setShowControls(false);
                      setPhase("waiting");
                      setVideoEnded(false);
                      setSeconds(150);
                      setAnalysisStep(0);
                    }}
                    className="group rounded-full px-4 py-2 text-[13px] font-semibold transition-all flex items-center justify-center bg-white text-[#1E2B3A] no-underline gap-x-2 active:scale-95 scale-100 duration-75"
                  >
                    Làm lại
                  </button>
                )}
                <button
                  onClick={handleAnalyze}
                  disabled={isSubmitting}
                  className="group rounded-full min-w-[140px] px-4 py-2 text-[13px] font-semibold transition-all flex items-center justify-center bg-[#1E2B3A] text-white no-underline active:scale-95 scale-100 duration-75 disabled:cursor-not-allowed"
                  style={{
                    boxShadow:
                      "0px 1px 4px rgba(13, 34, 71, 0.17), inset 0px 0px 0px 1px #061530, inset 0px 0px 0px 2px rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-x-2">
                      <svg
                        className="animate-spin h-5 w-5 text-slate-50 mx-auto"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth={3}
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>{status}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-x-2">
                      <span>Phân tích câu trả lời</span>
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M13.75 6.75L19.25 12L13.75 17.25"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M19 12H4.75"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4 text-[#407BBF]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <p className="text-[14px] leading-[20px] text-[#1a2b3b]">
            Video không được lưu trữ trên máy chủ.
          </p>
        </div>
      </div>
    </div>
  );
}
