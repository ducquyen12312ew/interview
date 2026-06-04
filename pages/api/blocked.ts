import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    error:
      "Bạn đã sử dụng quá nhiều lần thử. Vui lòng clone repository này và tự deploy để tiếp tục.",
  });
  return res.end();
}
