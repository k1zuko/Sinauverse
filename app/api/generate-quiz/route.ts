import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const { topic, count = 3, existingCount = 0 } = await req.json()
        const startNumber = existingCount + 1

        if (!topic) {
            return NextResponse.json({ message: "Topik diperlukan" }, { status: 400 })
        }

        const prompt = existingCount === 0
            ? `Buatkan ${count} soal pilihan ganda tentang topik "${topic}". Jawaban hanya format JSON array seperti ini:\n[
  {
    "question_text": "....",
    "points": 100,
    "options": [
      { "option_text": "...", "is_correct": true },
      ...
    ]
  }
]`
            : `Lanjutkan membuat ${count} soal pilihan ganda tentang topik "${topic}" dimulai dari soal nomor ${startNumber}. Jawaban hanya format JSON array seperti contoh berikut, tanpa penjelasan:\n[
  {
    "question_text": "....",
    "points": 100,
    "options": [
      { "option_text": "...", "is_correct": true },
      ...
    ]
  }
]`

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                }),
            }
        )

        const data = await response.json()

        let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

        // Bersihkan jika ada markdown block
        raw = raw.replace(/^```json/, "").replace(/```$/, "").trim()

        const jsonStart = raw.indexOf("[")
        if (jsonStart === -1) {
            return NextResponse.json({ message: "JSON tidak ditemukan dalam output AI", raw }, { status: 500 })
        }

        const jsonText = raw.slice(jsonStart)

        let parsed
        try {
            parsed = JSON.parse(jsonText)
        } catch (e) {
            console.error("❌ Gagal parsing JSON:", e)
            return NextResponse.json({ message: "Gagal parsing JSON", raw: jsonText }, { status: 500 })
        }

        return NextResponse.json({ questions: parsed })
    } catch (err: any) {
        console.error("🔥 Error tidak terduga:", err)
        return NextResponse.json({ message: "Terjadi kesalahan", error: err.message }, { status: 500 })
    }
}
