import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { count } from "console";

// 環境変数の読み込み
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini AI の初期化
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ミドルウェア設定
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 静的ファイルの配信設定
app.use(express.static(path.join(__dirname)));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/script", express.static(path.join(__dirname, "script")));

// API エンドポイント：クイズ生成
app.post("/api/generate-quiz", async (req, res) => {
    try {
        const { studyContent, quizCount = 5 } = req.body;

        if (!studyContent) {
            return res.status(400).json({
                error: "学習内容が入力されていません",
            });
        }

        console.log(`クイズ生成リクエスト: ${studyContent} (${quizCount}問)`);

        // Gemini AI にクイズ生成を依頼

        const prompt = createQuizPrompt(studyContent, quizCount);
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } },
        });

        const text = response.text;

        console.log("Gemini AI 応答:", text);

        // JSON形式で解析
        const quizData = parseAIResponse(text);

        res.json({
            success: true,
            quizzes: quizData.quizzes,
            studyContent: studyContent,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("クイズ生成エラー:", error);
        res.status(500).json({
            error: "クイズの生成に失敗しました",
            details: error.message,
        });
    }
});

// クイズ生成用のプロンプトを作成
function createQuizPrompt(studyContent, quizCount) {
    return (
        `あなたは教育的なクイズを生成する専門家です。以下の学習内容に基づいて、${quizCount}問の選択式クイズを生成してください。\n\n` +
        `学習内容: ${studyContent}\n\n` +
        `【重要】問題作成の制約条件:\n` +
        `- 上記の学習内容に記載された情報のみを使用してください\n` +
        `- あなたの事前知識や一般常識は一切使用しないでください\n` +
        `- 学習内容に記載されていない情報は問題に含めないでください\n` +
        `- 学習内容から直接読み取れる情報のみで問題と選択肢を作成してください\n\n` +
        `以下のJSON形式で回答してください:\n` +
        `{\n` +
        `  "quizzes": [\n` +
        `    {\n` +
        `      "id": 1,\n` +
        `      "question": "問題文",\n` +
        `      "options": {\n` +
        `        "A": "選択肢A",\n` +
        `        "B": "選択肢B",\n` +
        `        "C": "選択肢C",\n` +
        `        "D": "選択肢D"\n` +
        `      },\n` +
        `      "correctAnswer": "A",\n` +
        `      "explanation": "正解の説明",\n` +
        `      "optionExplanations": {\n` +
        `        "A": "選択肢Aの解説（正解の場合はなぜ正解か）",\n` +
        `        "B": "選択肢Bの解説（不正解の場合はなぜ間違いか）",\n` +
        `        "C": "選択肢Cの解説（不正解の場合はなぜ間違いか）",\n` +
        `        "D": "選択肢Dの解説（不正解の場合はなぜ間違いか）"\n` +
        `      }\n` +
        `    }\n` +
        `  ]\n` +
        `}\n\n` +
        `出力形式の注意事項:\n` +
        `- 必ず${quizCount}問生成してください\n` +
        `- 問題は学習内容に明記された情報のみを使用してください\n` +
        `- 選択肢は4つ（A、B、C、D）作成してください\n` +
        `- correctAnswerは"A"、"B"、"C"、"D"のいずれかを指定してください\n` +
        `- explanationには学習内容を根拠とした正解の理由を説明してください\n` +
        `- optionExplanationsには各選択肢について、正解の場合はなぜ正しいか、不正解の場合はなぜ間違いかを説明してください\n` +
        `- すべての解説は学習内容を根拠として作成してください\n` +
        `- 純粋なJSONのみを出力し、余計な説明文やコードブロックは含めないでください\n` +
        `- 日本語が正しく表示されるようにしてください\n` +
        `- 学習内容だけで${quizCount}問作成できない場合は、作成可能な問題数のみ生成してください`
    );
}

// AI応答の解析
function parseAIResponse(response) {
    try {
        // レスポンスをクリーンアップ
        let cleanResponse = response.trim();

        // コードブロックがある場合は除去
        if (cleanResponse.startsWith("```json")) {
            cleanResponse = cleanResponse
                .replace(/```json\s*/, "")
                .replace(/```\s*$/, "");
        } else if (cleanResponse.startsWith("```")) {
            cleanResponse = cleanResponse
                .replace(/```\s*/, "")
                .replace(/```\s*$/, "");
        }

        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error("AI応答の解析に失敗:", error);
        console.error("元の応答:", response);
        throw new Error("AI応答の形式が正しくありません");
    }
}

// ルートディレクトリでindex.htmlを配信
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ヘルスチェック用エンドポイント
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        geminiConfigured: !!process.env.GEMINI_API_KEY,
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`サーバーがhttp://localhost:${PORT}で起動しました`);
    console.log(
        `Gemini API設定: ${
            process.env.GEMINI_API_KEY ? "✅ 設定済み" : "❌ 未設定"
        }`
    );
});
