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

        // 学習データを保存（再生成・やり直し用）
        this.lastStudyContent = "";
        this.lastQuizCount = 3;
        this.originalQuizzes = []; // 同じ問題でやり直し用

        // Bearer トークン（localStorageで保存）
        this.bearerToken = localStorage.getItem("bearer_token") || null;

        this.initializeElements();
        this.bindEvents();
        this.updateTokenStatus();
    }

    // DOM要素の初期化
    initializeElements() {
        // 入力セクション
        this.studyContentInput = document.getElementById("studyContent");
        this.quizCountSelect = document.getElementById("quizCount");
        this.generateBtn = document.getElementById("generateBtn");
        this.resetInputBtn = document.getElementById("resetInputBtn");

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
        this.backToTopBtn = document.getElementById("backToTopBtn");

        // トークン入力ボタン・状態表示
        this.tokenBtn = document.getElementById("tokenBtn");
        this.tokenStatus = document.getElementById("tokenStatus");
    }

    // イベントリスナーの設定
    bindEvents() {
        this.generateBtn.addEventListener("click", () => this.generateQuiz());
        this.resetInputBtn.addEventListener("click", () => this.resetInput());
        if (this.tokenBtn) {
            this.tokenBtn.addEventListener("click", () =>
                this.promptBearerToken()
            );
        }

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
        this.backToTopBtn.addEventListener("click", () => this.backToTop());

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
            this.showError("学習内容を入力してください。", "creation");
            return;
        }

        // 学習データを保存（再生成・やり直し用）
        this.lastStudyContent = studyContent;
        this.lastQuizCount = quizCount;

        this.setLoadingState(true);

        try {
            // サーバーサイドAPIを使用してクイズを生成
            this.quizzes = await this.generateAIQuiz(studyContent, quizCount);

            if (this.quizzes && this.quizzes.length > 0) {
                // 元のクイズデータを保存（やり直し用）
                this.originalQuizzes = JSON.parse(JSON.stringify(this.quizzes));
                this.startQuiz();
            } else {
                const error = new Error("クイズの生成に失敗しました");
                error.type = "creation";
                throw error;
            }
        } catch (error) {
            console.error("クイズ生成エラー:", error);
            this.showError(
                error.message ||
                    "クイズの生成に失敗しました。もう一度お試しください。",
                error.type || "general"
            );
        } finally {
            this.setLoadingState(false);
        }
    }

    // トークンをプロンプトで入力・保存
    promptBearerToken() {
        const current = localStorage.getItem("bearer_token") || "";
        const token = prompt(
            "Bearer token を入力してください（空にすると削除）:",
            current
        );
        if (token === null) return; // キャンセル
        if (token.trim() === "") {
            localStorage.removeItem("bearer_token");
            this.bearerToken = null;
        } else {
            localStorage.setItem("bearer_token", token.trim());
            this.bearerToken = token.trim();
        }
        this.updateTokenStatus();
    }

    // トークン状態表示を更新
    updateTokenStatus() {
        if (!this.tokenStatus) return;
        this.tokenStatus.textContent = this.bearerToken ? "設定済み" : "未設定";
        this.tokenStatus.title = this.bearerToken
            ? "Bearer token が設定されています"
            : "Bearer token が未設定です";
    }

    // サーバーサイドAPIを使用してクイズを生成
    async generateAIQuiz(studyContent, count) {
        try {
            console.log("AIクイズ生成開始 - サーバーAPIを呼び出し");
            // Authorization ヘッダに Bearer トークンがあれば付与
            const headers = {
                "Content-Type": "application/json",
            };
            if (this.bearerToken) {
                headers["Authorization"] = `Bearer ${this.bearerToken}`;
            }

            // リクエストデータをログ出力
            const requestData = {
                studyContent: studyContent,
                quizCount: count,
            };
            console.log("送信データ:", requestData);

            // AbortControllerでタイムアウトを設定
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

            // サーバーサイドのAPIエンドポイントを呼び出し
            const response = await fetch("/api/generate-quiz", {
                method: "POST",
                headers,
                body: JSON.stringify(requestData),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log("Response status:", response.status);
            console.log("Response headers:", response.headers);
            if (!response.ok) {
                let status = response.status;
                let errorMessage = `HTTPエラー: ${status}`;
                let errorType = "api";

                try {
                    const errorData = await response.json();

                    if (status == 500) {
                        if (errorData.errorType === "creation_failed") {
                            errorMessage =
                                "問題の作成に失敗しました。\n学習内容を変更するか、問題数を減らして再度お試しください。";
                            errorType = "creation";
                        } else if (errorData.errorType === "api_error") {
                            errorMessage =
                                "AI APIでエラーが発生しました。\n時間をおいて再度お試しください。";
                            errorType = "api";
                        } else {
                            errorMessage =
                                "サーバー側でエラーが発生しました。\n時間をおいて再度お試しください。";
                        }
                    } else if (status == 400) {
                        errorMessage =
                            errorData.error || "入力内容に問題があります。";
                        errorType = "creation";
                    } else if (status == 429) {
                        errorMessage =
                            "API使用量の上限に達しました。\nしばらく待ってから再試行してください。";
                        errorType = "api";
                    } else {
                        errorMessage = errorData.error || errorMessage;
                    }

                    console.error("エラーレスポンス:", errorData);
                } catch (parseError) {
                    console.error("エラーレスポンスの解析に失敗:", parseError);
                }

                const error = new Error(errorMessage);
                error.type = errorType;
                throw error;
            }

            const data = await response.json();
            console.log("サーバーからのレスポンス:", data);

            if (data.success && data.quizzes) {
                return data.quizzes;
            } else {
                const error = new Error(
                    "問題の生成に失敗しました。学習内容を見直して再度お試しください。"
                );
                error.type = "creation";
                throw error;
            }
        } catch (error) {
            console.error("APIクイズ生成エラー:", error);

            // より詳細なエラー情報を提供
            if (error.name === "AbortError") {
                const timeoutError = new Error(
                    "リクエストがタイムアウトしました。もう一度お試しください。"
                );
                timeoutError.type = "api";
                throw timeoutError;
            } else if (
                error.name === "TypeError" &&
                error.message.includes("fetch")
            ) {
                const connectionError = new Error(
                    "サーバーに接続できません。サーバーが起動しているか確認してください。"
                );
                connectionError.type = "api";
                throw connectionError;
            } else if (error.name === "SyntaxError") {
                const parseError = new Error(
                    "サーバーからの応答が正しくありません。"
                );
                parseError.type = "api";
                throw parseError;
            } else {
                // 既存のエラータイプを保持
                if (!error.type) {
                    error.type = "api";
                }
                throw error;
            }
        }
    }

    // クイズ開始
    startQuiz() {
        this.currentQuiz = 0;
        this.score = 0;
        this.isAnswered = false;

        // UIの切り替え
        document.querySelector(".input-section").style.display = "none";
        this.quizSection.style.display = "block";
        this.resultSection.style.display = "none";

        // クイズ表示の初期化
        this.totalQuizSpan.textContent = this.quizzes.length;
        this.scoreSpan.textContent = this.score;

        this.displayQuiz();
    }

    // クイズ表示
    displayQuiz() {
        if (this.currentQuiz >= this.quizzes.length) {
            this.showResults();
            return;
        }

        const quiz = this.quizzes[this.currentQuiz];

        // 問題番号の更新
        this.currentQuizSpan.textContent = this.currentQuiz + 1;

        // 問題文の表示
        this.questionText.textContent = quiz.question;

        // 選択肢をランダムに配置
        const optionKeys = Object.keys(quiz.options);
        const optionEntries = optionKeys.map((key) => ({
            key: key,
            text: quiz.options[key],
            isCorrect: key === quiz.correctAnswer,
        }));

        // 選択肢をシャッフル
        const shuffledOptions = this.shuffleArray([...optionEntries]);

        // 正解の新しい位置を記録
        const correctIndex = shuffledOptions.findIndex(
            (option) => option.isCorrect
        );
        const newCorrectKey = ["A", "B", "C", "D"][correctIndex];

        // 現在のクイズの正解キーを更新
        this.currentCorrectAnswer = newCorrectKey;

        // 選択肢の表示
        this.optionBtns.forEach((btn, index) => {
            const option = shuffledOptions[index];
            const displayKey = ["A", "B", "C", "D"][index];

            btn.querySelector(".option-label").textContent = displayKey;
            btn.querySelector(".option-text").textContent = option.text;
            btn.dataset.option = displayKey;

            btn.classList.remove("selected", "correct", "incorrect");
            btn.disabled = false;
        });

        // フィードバックを非表示
        this.feedback.style.display = "none";

        // ボタンの状態をリセット
        this.submitAnswerBtn.disabled = true;
        this.submitAnswerBtn.style.display = "inline-block"; // 回答ボタンを再表示
        this.nextQuestionBtn.style.display = "none";
        this.restartQuizBtn.style.display = "none";

        // 「結果を見る」ボタンがあれば非表示にする
        if (this.showResultsBtn) {
            this.showResultsBtn.style.display = "none";
        }

        this.selectedAnswer = null;
        this.isAnswered = false;
    }

    // 回答選択
    selectAnswer(btn) {
        if (this.isAnswered) return;

        // 他の選択肢の選択状態をクリア
        this.optionBtns.forEach((button) => {
            button.classList.remove("selected");
        });

        // 選択した回答をマーク
        btn.classList.add("selected");
        this.selectedAnswer = btn.dataset.option;

        // 回答ボタンを有効化
        this.submitAnswerBtn.disabled = false;
    }

    // 回答提出
    submitAnswer() {
        if (!this.selectedAnswer || this.isAnswered) return;

        this.isAnswered = true;
        const quiz = this.quizzes[this.currentQuiz];
        const isCorrect = this.selectedAnswer === this.currentCorrectAnswer;

        // スコアの更新
        if (isCorrect) {
            this.score++;
            this.scoreSpan.textContent = this.score;
        }

        // 正解/不正解の表示
        this.optionBtns.forEach((btn) => {
            btn.disabled = true;

            if (btn.dataset.option === this.currentCorrectAnswer) {
                btn.classList.add("correct");
            } else if (
                btn.dataset.option === this.selectedAnswer &&
                !isCorrect
            ) {
                btn.classList.add("incorrect");
            }
        });

        // フィードバックの表示
        this.feedbackText.textContent = isCorrect
            ? "✅ 正解です！"
            : "❌ 不正解です";

        // 基本的な説明を表示
        this.explanationText.textContent = quiz.explanation;

        // 各選択肢の詳細解説を表示
        this.displayDetailedExplanations(quiz, isCorrect);

        this.feedback.style.display = "block";

        // ボタンの状態を更新
        this.submitAnswerBtn.style.display = "none";

        if (this.currentQuiz < this.quizzes.length - 1) {
            this.nextQuestionBtn.style.display = "inline-block";
        } else {
            // 最終問題の場合 - 「結果を見る」ボタンを表示
            this.nextQuestionBtn.style.display = "none";
            this.restartQuizBtn.style.display = "none";

            // 「結果を見る」ボタンを作成・表示
            if (!this.showResultsBtn) {
                this.showResultsBtn = document.createElement("button");
                this.showResultsBtn.className = "control-btn";
                this.showResultsBtn.textContent = "結果を見る";
                this.showResultsBtn.addEventListener("click", () =>
                    this.showResults()
                );
                // ボタンを適切な位置に挿入
                const controlsDiv = this.submitAnswerBtn.parentNode;
                controlsDiv.appendChild(this.showResultsBtn);
            }
            this.showResultsBtn.style.display = "inline-block";
        }
    }

    // 各選択肢の詳細解説を表示
    displayDetailedExplanations(quiz, isCorrect) {
        // 既存の詳細解説があれば削除
        const existingDetails = this.feedback.querySelector(
            ".detailed-explanations"
        );
        if (existingDetails) {
            existingDetails.remove();
        }

        // 各選択肢の解説があるかチェック
        if (!quiz.optionExplanations) {
            return;
        }

        // 詳細解説コンテナを作成
        const detailsContainer = document.createElement("div");
        detailsContainer.className = "detailed-explanations";

        const detailsTitle = document.createElement("h4");
        detailsTitle.textContent = "各選択肢の解説:";
        detailsTitle.style.marginTop = "1.5rem";
        detailsTitle.style.marginBottom = "1rem";
        detailsContainer.appendChild(detailsTitle);

        const explanationsGrid = document.createElement("div");
        explanationsGrid.className = "explanations-grid";

        // 元の選択肢キーと表示されたキーの対応を取得
        const originalToDisplayMapping = this.getOriginalToDisplayMapping(quiz);

        // 表示順序（A, B, C, D）で解説を表示
        const displayKeys = ["A", "B", "C", "D"];
        displayKeys.forEach((displayKey) => {
            // 表示キーに対応する元のキーを検索
            const originalKey = Object.keys(originalToDisplayMapping).find(
                (key) => originalToDisplayMapping[key] === displayKey
            );

            if (originalKey && quiz.optionExplanations[originalKey]) {
                const explanation = quiz.optionExplanations[originalKey];
                const isCorrectOption = originalKey === quiz.correctAnswer;
                const wasUserChoice = displayKey === this.selectedAnswer;

                const explanationCard = document.createElement("div");
                explanationCard.className = "explanation-card";

                if (isCorrectOption) {
                    explanationCard.classList.add("correct-card");
                } else if (wasUserChoice && !isCorrect) {
                    explanationCard.classList.add("user-wrong-card");
                }

                const cardTitle = document.createElement("h5");
                let titleText = `選択肢 ${displayKey}: ${quiz.options[originalKey]}`;
                if (isCorrectOption) {
                    titleText += " ✅";
                } else if (wasUserChoice && !isCorrect) {
                    titleText += " ❌ (あなたの選択)";
                }
                cardTitle.textContent = titleText;

                const cardContent = document.createElement("p");
                cardContent.textContent = explanation;

                explanationCard.appendChild(cardTitle);
                explanationCard.appendChild(cardContent);
                explanationsGrid.appendChild(explanationCard);
            }
        });

        detailsContainer.appendChild(explanationsGrid);
        this.feedback.appendChild(detailsContainer);
    }

    // 元の選択肢キーと表示キーの対応を取得
    getOriginalToDisplayMapping(quiz) {
        const mapping = {};

        this.optionBtns.forEach((btn) => {
            const displayKey = btn.dataset.option;
            const displayText = btn.querySelector(".option-text").textContent;

            // 元の選択肢から対応するキーを検索
            Object.entries(quiz.options).forEach(
                ([originalKey, originalText]) => {
                    if (originalText === displayText) {
                        mapping[originalKey] = displayKey;
                    }
                }
            );
        });

        return mapping;
    }

    // 次の問題
    nextQuestion() {
        this.currentQuiz++;
        this.displayQuiz();
    }

    // 結果表示
    showResults() {
        // 念のため、全てのクイズが完了していることを確認
        if (this.currentQuiz < this.quizzes.length - 1) {
            console.warn("まだクイズが完了していません");
            return;
        }

        this.quizSection.style.display = "none";
        this.resultSection.style.display = "block";

        // 最終スコアの表示
        this.finalScore.textContent = this.score;
        this.finalTotal.textContent = this.quizzes.length;

        // 結果メッセージの設定
        const percentage = (this.score / this.quizzes.length) * 100;
        let message = "";

        if (percentage === 100) {
            message = "🎉 パーフェクト！素晴らしい成績です！";
        } else if (percentage >= 80) {
            message = "🌟 優秀！とても良い成績です！";
        } else if (percentage >= 60) {
            message = "👍 良い成績です！さらに頑張りましょう！";
        } else {
            message = "📚 もう少し復習が必要ですね。頑張りましょう！";
        }

        this.resultMessage.textContent = message;
    }

    // クイズのリスタート
    restartQuiz() {
        this.currentQuiz = 0;
        this.score = 0;
        this.scoreSpan.textContent = this.score;
        this.displayQuiz();

        this.resultSection.style.display = "none";
        this.quizSection.style.display = "block";
    }

    // 新しいクイズ → トップへ戻る
    backToTop() {
        // 入力セクションに戻る
        this.resultSection.style.display = "none";
        this.quizSection.style.display = "none";
        document.querySelector(".input-section").style.display = "block";

        // 直前の入力内容を復元
        this.studyContentInput.value = this.lastStudyContent;
        this.quizCountSelect.value = this.lastQuizCount;
        this.studyContentInput.focus();
    }

    // 入力内容のリセット
    resetInput() {
        this.studyContentInput.value = "";
        this.quizCountSelect.value = 3;
        this.lastStudyContent = "";
        this.lastQuizCount = 3;
        this.studyContentInput.focus();
    }

    // ローディング状態の設定
    setLoadingState(isLoading) {
        const btnText = this.generateBtn.querySelector(".btn-text");
        const spinner = this.generateBtn.querySelector(".spinner");

        if (isLoading) {
            btnText.textContent = "問題作成中です";
            btnText.style.display = "inline";
            spinner.style.display = "inline";
            this.generateBtn.disabled = true;

            // 問題生成中は入力内容の変更を禁止
            this.studyContentInput.disabled = true;
            this.quizCountSelect.disabled = true;
            this.resetInputBtn.disabled = true;
        } else {
            btnText.textContent = "クイズを生成";
            btnText.style.display = "inline";
            spinner.style.display = "none";
            this.generateBtn.disabled = false;

            // 問題生成完了後は入力内容の変更を許可
            this.studyContentInput.disabled = false;
            this.quizCountSelect.disabled = false;
            this.resetInputBtn.disabled = false;
        }
    }

    // エラー表示
    showError(message, errorType = "general") {
        console.error("エラー表示:", message, "タイプ:", errorType);

        // エラータイプに応じてメッセージを装飾
        let displayMessage = message;
        if (errorType === "creation") {
            displayMessage = "【問題作成エラー】\n" + message;
        } else if (errorType === "api") {
            displayMessage = "【API通信エラー】\n" + message;
        }

        alert(displayMessage);
    }

    // 配列をシャッフルするユーティリティ関数（Fisher-Yates シャッフル）
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// アプリケーション初期化
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM読み込み完了");
    window.quizApp = new QuizApp();
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
