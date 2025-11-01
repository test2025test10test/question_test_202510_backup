// フロントエンド用のクイズアプリケーション
// サーバーサイドのAPIを使用してクイズを生成

// AIクイズ生成アプリのメインクラス
class QuizApp {
    constructor() {
        this.currentQuiz = 0;
        this.score = 0;
        this.quizzes = [];
        this.selectedAnswer = null;
        this.isAnswered = false;

        this.initializeElements();
        this.bindEvents();
    }

    // DOM要素の初期化
    initializeElements() {
        // 入力セクション
        this.studyContentInput = document.getElementById("studyContent");
        this.quizCountSelect = document.getElementById("quizCount");
        this.generateBtn = document.getElementById("generateBtn");

        // クイズセクション
        this.quizSection = document.querySelector(".quiz-section");
        this.currentQuizSpan = document.getElementById("currentQuiz");
        this.totalQuizSpan = document.getElementById("totalQuiz");
        this.scoreSpan = document.getElementById("score");
        this.questionText = document.getElementById("questionText");
        this.optionBtns = document.querySelectorAll(".option-btn");
        this.feedback = document.querySelector(".feedback");
        this.feedbackText = document.getElementById("feedbackText");
        this.explanationText = document.getElementById("explanationText");

        // コントロールボタン
        this.submitAnswerBtn = document.getElementById("submitAnswer");
        this.nextQuestionBtn = document.getElementById("nextQuestion");
        this.restartQuizBtn = document.getElementById("restartQuiz");

        // 結果セクション
        this.resultSection = document.querySelector(".result-section");
        this.finalScore = document.getElementById("finalScore");
        this.finalTotal = document.getElementById("finalTotal");
        this.resultMessage = document.getElementById("resultMessage");
        this.newQuizBtn = document.getElementById("newQuiz");
        this.reviewAnswersBtn = document.getElementById("reviewAnswers");
    }

    // イベントリスナーの設定
    bindEvents() {
        this.generateBtn.addEventListener("click", () => this.generateQuiz());

        this.optionBtns.forEach((btn) => {
            btn.addEventListener("click", () => this.selectAnswer(btn));
        });

        this.submitAnswerBtn.addEventListener("click", () =>
            this.submitAnswer()
        );
        this.nextQuestionBtn.addEventListener("click", () =>
            this.nextQuestion()
        );
        this.restartQuizBtn.addEventListener("click", () => this.restartQuiz());
        this.newQuizBtn.addEventListener("click", () => this.newQuiz());
        this.reviewAnswersBtn.addEventListener("click", () =>
            this.reviewAnswers()
        );

        // エンターキーでクイズ生成
        this.studyContentInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && e.ctrlKey) {
                this.generateQuiz();
            }
        });
    }

    // クイズ生成
    async generateQuiz() {
        const studyContent = this.studyContentInput.value.trim();
        const quizCount = parseInt(this.quizCountSelect.value);

        if (!studyContent) {
            this.showError("学習内容を入力してください。");
            return;
        }

        this.setLoadingState(true);

        try {
            // 実際のAI APIを使用してクイズを生成
            this.quizzes = await this.generateAIQuiz(studyContent, quizCount);

            if (this.quizzes && this.quizzes.length > 0) {
                this.startQuiz();
            } else {
                // フォールバック: モックデータを使用
                console.log("AI生成に失敗、モックデータを使用");
                this.quizzes = await this.generateMockQuizzes(
                    studyContent,
                    quizCount
                );
                this.startQuiz();
            }
        } catch (error) {
            console.error("クイズ生成エラー:", error);

            try {
                // フォールバック: まずサンプルJSONを試す
                console.log("エラー発生、サンプルJSONを使用");
                this.quizzes = await this.loadSampleJSON();
                this.startQuiz();
            } catch (sampleError) {
                try {
                    // 最終フォールバック: モックデータを使用
                    console.log("サンプルJSON読み込み失敗、モックデータを使用");
                    this.quizzes = await this.generateMockQuizzes(
                        studyContent,
                        quizCount
                    );
                    this.startQuiz();
                } catch (mockError) {
                    console.error("モックデータ生成エラー:", mockError);
                    this.showError(
                        "クイズの生成に失敗しました。もう一度お試しください。"
                    );
                }
            }
        } finally {
            this.setLoadingState(false);
        }
    }

    // サーバーサイドAPIを使用してクイズを生成
    async generateAIQuiz(studyContent, count) {
        try {
            console.log("AIクイズ生成開始 - サーバーAPIを呼び出し");

            // サーバーサイドのAPIエンドポイントを呼び出し
            const response = await fetch("/api/generate-quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    studyContent: studyContent,
                    quizCount: count,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "クイズ生成に失敗しました");
            }

            const data = await response.json();
            console.log("サーバーからのレスポンス:", data);

            if (data.success && data.quizzes) {
                return data.quizzes;
            } else {
                throw new Error("無効なレスポンス形式");
            }
        } catch (error) {
            console.error("APIクイズ生成エラー:", error);
            throw error;
        }
    }

    // プロンプト作成
    createPrompt(studyContent, count) {
        return `以下の学習内容を参考に、${count}問の4択クイズを生成してください。

【学習内容】
${studyContent}

【出力形式】
以下のJSON形式で厳密に出力してください：

{
  "questions": [
    {
      "question": "問題文をここに記載",
      "choices": [
        "選択肢A",
        "選択肢B",
        "選択肢C",
        "選択肢D"
      ],
      "correct_answer": 0,
      "explanations": [
        "選択肢Aの解説：なぜこれが正解なのか、または不正解なのかを詳しく説明",
        "選択肢Bの解説：なぜこれが正解なのか、または不正解なのかを詳しく説明",
        "選択肢Cの解説：なぜこれが正解なのか、または不正解なのかを詳しく説明",
        "選択肢Dの解説：なぜこれが正解なのか、または不正解なのかを詳しく説明"
      ]
    }
  ]
}

【要求事項】
- correct_answerは正解の選択肢のインデックス（0-3）で指定
- 各選択肢には詳細な解説を必ず付ける
- 正解の解説では「なぜ正解なのか」を説明
- 不正解の解説では「なぜ間違いなのか」を説明
- 学習内容に基づいた問題を作成
- 選択肢は適切な難易度にする
- 必ずJSON形式のみで回答してください（コードブロック不要）`;
    }

    // AI応答の解析とクイズデータ変換
    async parseAIResponse(responseText, count) {
        try {
            console.log("JSON解析開始");

            // レスポンステキストからコードブロックを除去
            let cleanText = responseText.trim();
            if (cleanText.startsWith("```json")) {
                cleanText = cleanText.replace(/^```json\s*/, "");
            }
            if (cleanText.endsWith("```")) {
                cleanText = cleanText.replace(/\s*```$/, "");
            }

            // JSONを解析
            const jsonData = JSON.parse(cleanText);
            console.log("解析されたJSON:", jsonData);

            // JSONデータをアプリ用の形式に変換
            if (jsonData.questions && Array.isArray(jsonData.questions)) {
                const quizzes = jsonData.questions.map((question, index) => {
                    console.log(`問題 ${index + 1}: ${question.question}`);

                    return {
                        question: question.question,
                        options: question.choices,
                        correctAnswer: question.correct_answer,
                        explanation: this.formatExplanation(
                            question.explanations,
                            question.correct_answer
                        ),
                        detailedExplanations: question.explanations,
                    };
                });

                console.log(
                    `${quizzes.length}問のクイズが正常に生成されました`
                );
                return quizzes;
            } else {
                throw new Error("JSONの構造が正しくありません");
            }
        } catch (error) {
            console.error("JSON解析エラー:", error);
            console.log("元のレスポンス:", responseText);

            // フォールバック: モックデータを使用
            console.log("モックデータにフォールバック");
            return await this.generateMockQuizzes(
                "フォールバック学習内容",
                count
            );
        }
    }

    // 解説テキストをフォーマット
    formatExplanation(explanations, correctAnswer) {
        if (!explanations || !Array.isArray(explanations)) {
            return "解説情報が利用できません。";
        }

        const correctExplanation = explanations[correctAnswer];
        const otherExplanations = explanations
            .filter((_, index) => index !== correctAnswer)
            .slice(0, 2); // 最大2つの不正解解説を表示

        let result = `正解の解説: ${correctExplanation}`;

        if (otherExplanations.length > 0) {
            result += `\n\nその他の選択肢について:\n${otherExplanations.join(
                "\n"
            )}`;
        }

        return result;
    }

    // サンプルJSONファイルからクイズデータを読み込み
    async loadSampleJSON() {
        try {
            console.log("サンプルJSONファイルを読み込み中...");
            const response = await fetch("./sample.json");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const jsonData = await response.json();
            console.log("サンプルJSON読み込み完了:", jsonData);

            if (jsonData.questions && Array.isArray(jsonData.questions)) {
                const quizzes = jsonData.questions.map((question, index) => {
                    return {
                        question: question.question,
                        options: question.choices,
                        correctAnswer: question.correct_answer,
                        explanation: this.formatExplanation(
                            question.explanations,
                            question.correct_answer
                        ),
                        detailedExplanations: question.explanations,
                    };
                });

                console.log(
                    `サンプルJSONから${quizzes.length}問のクイズを読み込みました`
                );
                return quizzes;
            } else {
                throw new Error("サンプルJSONの構造が正しくありません");
            }
        } catch (error) {
            console.error("サンプルJSON読み込みエラー:", error);
            throw error;
        }
    }

    // モッククイズデータ生成（実際のAI APIに置き換える）
    async generateMockQuizzes(studyContent, count) {
        console.log("モックデータ生成開始:", { studyContent, count });
        // 実際の実装では、ここでAI APIを呼び出す
        await this.delay(2000); // API呼び出しのシミュレーション

        const mockQuizzes = [
            {
                question: `${studyContent}に関する基本的な問題です。次のうち正しいものはどれですか？`,
                options: [
                    "オプション A - 最初の選択肢",
                    "オプション B - 二番目の選択肢",
                    "オプション C - 三番目の選択肢",
                    "オプション D - 四番目の選択肢",
                ],
                correctAnswer: 0,
                explanation:
                    "これは正解の説明です。詳細な理由と追加情報を含みます。",
            },
            {
                question: `${studyContent}についてさらに詳しく。以下の記述で間違っているものは？`,
                options: [
                    "正しい記述 1",
                    "間違った記述（これが正解）",
                    "正しい記述 2",
                    "正しい記述 3",
                ],
                correctAnswer: 1,
                explanation: "この選択肢が間違いである理由を詳しく説明します。",
            },
            {
                question: `${studyContent}の応用問題です。最も適切な答えを選んでください。`,
                options: [
                    "不適切な選択肢 1",
                    "不適切な選択肢 2",
                    "最も適切な選択肢（正解）",
                    "部分的に正しい選択肢",
                ],
                correctAnswer: 2,
                explanation:
                    "この選択肢が最も適切である理由と、他の選択肢が適切でない理由を説明します。",
            },
        ];

        // 指定された数だけクイズを返す（繰り返しまたは生成）
        const quizzes = [];
        for (let i = 0; i < count; i++) {
            const baseQuiz = mockQuizzes[i % mockQuizzes.length];
            quizzes.push({
                ...baseQuiz,
                question: `問題${i + 1}: ${baseQuiz.question}`,
            });
        }

        console.log("生成されたモックデータ:", quizzes);
        return quizzes;
    }

    // クイズ開始
    startQuiz() {
        console.log("クイズ開始:", this.quizzes);
        this.currentQuiz = 0;
        this.score = 0;
        this.answerHistory = []; // 回答履歴を初期化
        this.hideAllSections();
        this.quizSection.style.display = "block";
        this.totalQuizSpan.textContent = this.quizzes.length;
        this.showCurrentQuiz();
    }

    // 現在のクイズを表示
    showCurrentQuiz() {
        console.log("現在のクイズ表示:", this.currentQuiz, this.quizzes.length);
        if (this.currentQuiz >= this.quizzes.length) {
            this.showResults();
            return;
        }

        const quiz = this.quizzes[this.currentQuiz];
        console.log("表示するクイズ:", quiz);
        this.currentQuizSpan.textContent = this.currentQuiz + 1;
        this.scoreSpan.textContent = this.score;
        this.questionText.textContent = quiz.question;

        // 選択肢を設定
        this.optionBtns.forEach((btn, index) => {
            const optionText = btn.querySelector(".option-text");
            optionText.textContent = quiz.options[index];
            btn.classList.remove("selected", "correct", "incorrect");
            btn.disabled = false;
        });

        // 状態をリセット
        this.selectedAnswer = null;
        this.isAnswered = false;
        this.submitAnswerBtn.disabled = true;
        this.submitAnswerBtn.style.display = "inline-block"; // 回答ボタンを表示
        this.nextQuestionBtn.style.display = "none";
        this.nextQuestionBtn.textContent = "次の問題"; // ボタンテキストをリセット
        this.feedback.style.display = "none";

        console.log(
            `問題${this.currentQuiz + 1}の状態リセット完了 - 回答ボタン表示: ${
                this.submitAnswerBtn.style.display
            }`
        );

        // アニメーション
        this.quizSection.classList.add("slide-in-right");
        setTimeout(() => {
            this.quizSection.classList.remove("slide-in-right");
        }, 500);
    }

    // 回答選択
    selectAnswer(selectedBtn) {
        if (this.isAnswered) return;

        // 前の選択を解除
        this.optionBtns.forEach((btn) => btn.classList.remove("selected"));

        // 新しい選択を設定
        selectedBtn.classList.add("selected");
        this.selectedAnswer = Array.from(this.optionBtns).indexOf(selectedBtn);
        this.submitAnswerBtn.disabled = false;
    }

    // 回答提出
    submitAnswer() {
        if (this.selectedAnswer === null || this.isAnswered) return;

        this.isAnswered = true;
        const quiz = this.quizzes[this.currentQuiz];
        const isCorrect = this.selectedAnswer === quiz.correctAnswer;

        // 回答履歴を記録
        if (!this.answerHistory) {
            this.answerHistory = [];
        }
        this.answerHistory[this.currentQuiz] = this.selectedAnswer;

        // 結果を表示
        this.optionBtns.forEach((btn, index) => {
            btn.disabled = true;
            if (index === quiz.correctAnswer) {
                btn.classList.add("correct");
            } else if (index === this.selectedAnswer && !isCorrect) {
                btn.classList.add("incorrect");
            }
        });

        // フィードバックを表示
        this.showFeedback(isCorrect, quiz.explanation);

        if (isCorrect) {
            this.score++;
            this.scoreSpan.textContent = this.score;
        }

        this.submitAnswerBtn.style.display = "none";
        this.nextQuestionBtn.style.display = "inline-block";

        console.log(`回答提出後 - 回答ボタン非表示、次の問題ボタン表示`);
        console.log(
            `回答履歴記録: 問題${this.currentQuiz + 1} -> 選択肢${
                this.selectedAnswer + 1
            }`
        );

        // 最後の問題の場合
        if (this.currentQuiz === this.quizzes.length - 1) {
            this.nextQuestionBtn.textContent = "結果を見る";
            console.log("最後の問題なので、ボタンテキストを'結果を見る'に変更");
        }
    }

    // フィードバック表示（詳細解説付き）
    showFeedback(isCorrect, explanation) {
        const quiz = this.quizzes[this.currentQuiz];

        // 基本的なフィードバック
        this.feedbackText.textContent = isCorrect
            ? "🎉 正解です！"
            : "❌ 不正解です";

        // 詳細な解説を表示
        if (
            quiz.detailedExplanations &&
            Array.isArray(quiz.detailedExplanations)
        ) {
            this.showDetailedExplanations(
                quiz.detailedExplanations,
                quiz.correctAnswer,
                this.selectedAnswer
            );
        } else {
            this.explanationText.textContent = explanation;
        }

        this.feedback.className = `feedback ${
            isCorrect ? "correct" : "incorrect"
        }`;
        this.feedback.style.display = "block";

        // アニメーション効果
        this.feedback.classList.add("fade-in");
        setTimeout(() => {
            this.feedback.classList.remove("fade-in");
        }, 500);
    }

    // 詳細解説の表示
    showDetailedExplanations(explanations, correctAnswer, selectedAnswer) {
        let explanationHTML = "";

        // 正解の解説を強調表示
        explanationHTML += `<div class="correct-explanation">
            <h4>✅ 正解: ${
                this.quizzes[this.currentQuiz].options[correctAnswer]
            }</h4>
            <p>${explanations[correctAnswer]}</p>
        </div>`;

        // 選択した答えが間違いの場合、その解説も表示
        if (selectedAnswer !== correctAnswer) {
            explanationHTML += `<div class="selected-explanation">
                <h4>❌ あなたの選択: ${
                    this.quizzes[this.currentQuiz].options[selectedAnswer]
                }</h4>
                <p>${explanations[selectedAnswer]}</p>
            </div>`;
        }

        // 全選択肢の解説を折りたたみ形式で表示
        explanationHTML += `<details class="all-explanations">
            <summary>全選択肢の解説を見る</summary>
            <div class="explanations-list">`;

        explanations.forEach((exp, index) => {
            const label = String.fromCharCode(65 + index); // A, B, C, D
            const isCorrect = index === correctAnswer;
            const isSelected = index === selectedAnswer;

            explanationHTML += `<div class="explanation-item ${
                isCorrect ? "correct-item" : ""
            } ${isSelected ? "selected-item" : ""}">
                <h5>${label}. ${
                this.quizzes[this.currentQuiz].options[index]
            } ${isCorrect ? "✅" : ""} ${
                isSelected && !isCorrect ? "❌" : ""
            }</h5>
                <p>${exp}</p>
            </div>`;
        });

        explanationHTML += `</div></details>`;

        this.explanationText.innerHTML = explanationHTML;
    }

    // 次の問題
    nextQuestion() {
        console.log(
            `次の問題へ移動: ${this.currentQuiz + 1} -> ${this.currentQuiz + 2}`
        );
        this.currentQuiz++;
        if (this.currentQuiz >= this.quizzes.length) {
            console.log("全問題完了、結果画面へ");
            this.showResults();
        } else {
            console.log(`問題${this.currentQuiz + 1}を表示`);
            this.showCurrentQuiz();
        }
    }

    // 結果表示
    showResults() {
        this.hideAllSections();
        this.resultSection.style.display = "block";

        this.finalScore.textContent = this.score;
        this.finalTotal.textContent = this.quizzes.length;

        const percentage = Math.round((this.score / this.quizzes.length) * 100);
        let message = "";

        if (percentage >= 90) {
            message = "🏆 素晴らしい！完璧に近い成績です！";
        } else if (percentage >= 70) {
            message = "🎯 とても良い成績です！";
        } else if (percentage >= 50) {
            message = "👍 まずまずの成績です。復習して再挑戦してみましょう！";
        } else {
            message = "📚 学習を続けて、もう一度挑戦してみましょう！";
        }

        this.resultMessage.textContent = message;
        this.resultSection.classList.add("fade-in");
    }

    // クイズリスタート
    restartQuiz() {
        this.currentQuiz = 0;
        this.score = 0;
        this.showCurrentQuiz();
    }

    // 新しいクイズ
    newQuiz() {
        console.log("新しいクイズを開始");
        this.hideAllSections();
        // メインセクションを表示
        const mainElement = document.querySelector("main");
        if (mainElement) {
            mainElement.style.display = "block";
        }
        // 入力セクションを表示
        const inputSection = document.querySelector(".input-section");
        if (inputSection) {
            inputSection.style.display = "block";
        }
        this.studyContentInput.value = "";
        this.studyContentInput.focus();
    }

    // 回答振り返り
    reviewAnswers() {
        this.hideAllSections();
        this.showReviewSection();
    }

    // 振り返り画面の表示
    showReviewSection() {
        // 既存の振り返りセクションがあれば削除
        const existingReview = document.querySelector(".review-section");
        if (existingReview) {
            existingReview.remove();
        }

        // 新しい振り返りセクションを作成
        const reviewSection = document.createElement("section");
        reviewSection.className = "review-section";
        reviewSection.innerHTML = this.createReviewHTML();

        // メインコンテナに追加
        const container = document.querySelector(".container");
        container.appendChild(reviewSection);

        // 振り返りセクションを表示
        reviewSection.style.display = "block";
        reviewSection.classList.add("fade-in");

        // イベントリスナーを追加
        this.bindReviewEvents(reviewSection);
    }

    // 振り返り画面のHTML生成
    createReviewHTML() {
        const totalQuestions = this.quizzes.length;
        const correctAnswers = this.score;
        const incorrectAnswers = totalQuestions - correctAnswers;

        let reviewHTML = `
            <div class="review-header">
                <h2>📊 回答の振り返り</h2>
                <div class="review-summary">
                    <div class="summary-item correct">
                        <span class="summary-number">${correctAnswers}</span>
                        <span class="summary-label">正解</span>
                    </div>
                    <div class="summary-item incorrect">
                        <span class="summary-number">${incorrectAnswers}</span>
                        <span class="summary-label">不正解</span>
                    </div>
                    <div class="summary-item total">
                        <span class="summary-number">${totalQuestions}</span>
                        <span class="summary-label">総問題数</span>
                    </div>
                </div>
            </div>

            <div class="review-content">
        `;

        // 各問題の詳細レビュー
        this.quizzes.forEach((quiz, index) => {
            const userAnswer = this.getUserAnswer(index); // この関数は後で実装
            const isCorrect = userAnswer === quiz.correctAnswer;

            reviewHTML += `
                <div class="review-item ${isCorrect ? "correct" : "incorrect"}">
                    <div class="review-question">
                        <h3>問題 ${index + 1} ${isCorrect ? "✅" : "❌"}</h3>
                        <p class="question-text">${quiz.question}</p>
                    </div>
                    
                    <div class="review-answers">
                        <div class="answer-comparison">
                            <div class="user-answer ${
                                isCorrect ? "correct" : "incorrect"
                            }">
                                <h4>あなたの回答:</h4>
                                <p>${
                                    userAnswer !== null
                                        ? quiz.options[userAnswer]
                                        : "未回答"
                                }</p>
                            </div>
                            <div class="correct-answer">
                                <h4>正解:</h4>
                                <p>${quiz.options[quiz.correctAnswer]}</p>
                            </div>
                        </div>
                        
                        <div class="detailed-explanation">
                            <h4>詳細解説:</h4>
                            ${
                                quiz.detailedExplanations
                                    ? this.createDetailedExplanationHTML(
                                          quiz.detailedExplanations,
                                          quiz.correctAnswer,
                                          userAnswer,
                                          quiz.options
                                      )
                                    : `<p>${quiz.explanation}</p>`
                            }
                        </div>
                    </div>
                </div>
            `;
        });

        reviewHTML += `
            </div>
            
            <div class="review-actions">
                <button class="btn btn-primary" id="restartFromReview">もう一度挑戦</button>
                <button class="btn btn-secondary" id="newQuizFromReview">新しいクイズ</button>
                <button class="btn btn-outline" id="backToResults">結果に戻る</button>
            </div>
        `;

        return reviewHTML;
    }

    // 詳細解説のHTML生成
    createDetailedExplanationHTML(
        explanations,
        correctAnswer,
        userAnswer,
        quizOptions
    ) {
        let html = `<div class="explanations-grid">`;

        explanations.forEach((explanation, index) => {
            const label = String.fromCharCode(65 + index);
            const isCorrect = index === correctAnswer;
            const isUserAnswer = index === userAnswer;

            html += `
                <div class="explanation-card ${
                    isCorrect ? "correct-card" : ""
                } ${isUserAnswer && !isCorrect ? "user-wrong-card" : ""}">
                    <h5>${label}. ${quizOptions[index] || ""} 
                        ${isCorrect ? "✅" : ""} 
                        ${isUserAnswer && !isCorrect ? "❌" : ""}
                    </h5>
                    <p>${explanation}</p>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    // ユーザーの回答を取得
    getUserAnswer(questionIndex) {
        if (
            !this.answerHistory ||
            this.answerHistory[questionIndex] === undefined
        ) {
            return null; // 未回答の場合
        }
        return this.answerHistory[questionIndex];
    }

    // 振り返り画面のイベントリスナー
    bindReviewEvents(reviewSection) {
        const restartBtn = reviewSection.querySelector("#restartFromReview");
        const newQuizBtn = reviewSection.querySelector("#newQuizFromReview");
        const backBtn = reviewSection.querySelector("#backToResults");

        if (restartBtn) {
            restartBtn.addEventListener("click", () => {
                reviewSection.remove();
                this.restartQuiz();
            });
        }

        if (newQuizBtn) {
            newQuizBtn.addEventListener("click", () => {
                reviewSection.remove();
                this.newQuiz();
            });
        }

        if (backBtn) {
            backBtn.addEventListener("click", () => {
                reviewSection.remove();
                this.showResults();
            });
        }
    }

    // 全セクションを非表示
    hideAllSections() {
        console.log("全セクションを非表示");
        const inputSection = document.querySelector(".input-section");
        if (inputSection) {
            inputSection.style.display = "none";
        }
        if (this.quizSection) {
            this.quizSection.style.display = "none";
        }
        if (this.resultSection) {
            this.resultSection.style.display = "none";
        }
    }

    // ローディング状態の設定
    setLoadingState(isLoading) {
        const btnText = this.generateBtn.querySelector(".btn-text");
        const spinner = this.generateBtn.querySelector(".spinner");

        if (isLoading) {
            btnText.textContent = "クイズを生成中...";
            spinner.style.display = "inline";
            this.generateBtn.disabled = true;
        } else {
            btnText.textContent = "クイズを生成";
            spinner.style.display = "none";
            this.generateBtn.disabled = false;
        }
    }

    // エラー表示
    showError(message) {
        alert(`エラー: ${message}`);
    }

    // 遅延関数
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// AI API統合クラス（将来の拡張用）
class AIQuizGenerator {
    constructor(apiKey = null) {
        this.apiKey = apiKey;
        this.baseURL = "https://api.openai.com/v1"; // 例: OpenAI API
    }

    // AI APIを使用してクイズを生成
    async generateQuizzes(studyContent, count = 5) {
        if (!this.apiKey) {
            throw new Error("AI API キーが設定されていません");
        }

        const prompt = this.createPrompt(studyContent, count);

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content:
                                "あなたは教育的なクイズを生成する専門家です。与えられたトピックに基づいて、適切な難易度の多肢選択問題を作成してください。",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.7,
                }),
            });

            const data = await response.json();
            return this.parseAIResponse(data.choices[0].message.content);
        } catch (error) {
            console.error("AI API エラー:", error);
            throw error;
        }
    }

    // プロンプト作成
    createPrompt(studyContent, count) {
        return (
            "以下の文字列を参考に、4択問題を複数生成してください。\n" +
            "【入力文字列】\n" +
            studyContent +
            "\n" +
            "【出力形式】\n以下のJSON形式で厳密に出力してください：\n" +
            '"questions": [\n    {\n      "question": "問題文をここに記載",\n      "choices": [\n        "選択肢A",\n        "選択肢B", \n        "選択肢C",\n        "選択肢D"\n      ],\n      "correct_answer": 0,\n      "explanations": [\n        "選択肢Aの解説：なぜこれが正解なのか、または不正解なのかを詳しく説明",\n        "選択肢Bの解説：なぜこれが正解なのか、または不正解なのかを詳しく説明",\n        "選択肢Cの解説：なぜこれが正解なのか、または不正解なのかを詳しく説明", \n        "選択肢Dの解説：なぜこれが正解なのか、または不正解なのかを詳しく説明"\n      ]\n    }\n  ]\n\n' +
            "【要求事項】\n- 問題数：" +
            count +
            "問生成する\n" +
            "- correct_answerは正解の選択肢のインデックス（0-3）で指定\n" +
            "- 各選択肢には詳細な解説を必ず付ける\n" +
            "- 正解の解説では「なぜ正解なのか」を説明\n" +
            "- 不正解の解説では「なぜ間違いなのか」を説明  \n" +
            "- 正答は入力文字列の内容に基づいたものを作成\n" +
            "- 選択肢は紛らわしいものも含めて適切な難易度にする\n" +
            "- 問題文は明確で理解しやすい日本語で記述\n" +
            "- JSONの構文エラーがないよう注意深く生成\n\n" +
            "【注意事項】\n" +
            "- 必ずJSON形式のみで回答してください\n" +
            "- コードブロック（```json）は不要です\n" +
            "- 余計な説明文は含めず、純粋なJSONのみを出力してください\n" +
            "- 文字エンコーディングに注意し、日本語が正しく表示されるようにしてください\n"
        );
    }

    // AI応答の解析
    parseAIResponse(response) {
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error("AI応答の解析に失敗:", error);
            throw new Error("AI応答の形式が正しくありません");
        }
    }
}

// アプリケーション初期化
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM読み込み完了");
    window.quizApp = new QuizApp();

    // AI API統合のための設定（オプション）
    window.aiGenerator = new AIQuizGenerator();

    console.log("🚀 AIクイズ生成アプリが正常に起動しました");

    // 初期状態で入力セクションが表示されていることを確認
    const inputSection = document.querySelector(".input-section");
    if (inputSection) {
        inputSection.style.display = "block";
        console.log("入力セクションを表示しました");
    }
});

// サービスワーカー登録（PWA対応、オプション）
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
                console.log("SW registered: ", registration);
            })
            .catch((registrationError) => {
                console.log("SW registration failed: ", registrationError);
            });
    });
}
