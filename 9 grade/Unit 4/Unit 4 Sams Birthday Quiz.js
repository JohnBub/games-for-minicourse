const U4BdQuiz = (function () {
    'use strict';

    // ========== STATE ==========
    let state = {
        currentQuestion: 1,
        totalQuestions: 15,
        answers: {},
        checked: {},
    };

    let dom = {};

    function init() {
        // ========== DOM REFERENCES ==========
        dom.container = document.getElementById('u4bd-quiz-container');
        if (!dom.container) {
            console.warn('U4BdQuiz: Container not found. Init aborted.');
            return;
        }
        dom.resultsSlide = document.getElementById('u4bd-results');
        dom.counterEl = document.getElementById('u4bd-counter');
        dom.progressFill = document.getElementById('u4bd-progress-fill');

        // Initialize UI
        updateCounter();
        updateProgress();
        attachEvents();
        console.log('U4BdQuiz: Initialized');
    }

    // ========== HELPER FUNCTIONS ==========
    function updateCounter() {
        if (!dom.counterEl) return;
        let text = 'Question ' + state.currentQuestion + ' / ' + state.totalQuestions;
        if (dom.container.classList.contains('u4bd-review-mode')) {
            text = 'Review: ' + state.currentQuestion + ' / ' + state.totalQuestions;
        }
        dom.counterEl.textContent = text;
    }

    function updateProgress() {
        if (!dom.progressFill) return;
        const percent = (state.currentQuestion / state.totalQuestions) * 100;
        dom.progressFill.style.width = percent + '%';
    }

    function showSlide(num) {
        if (!dom.container) return;

        const slides = dom.container.querySelectorAll('.u4bd-question');
        slides.forEach(function (slide) {
            slide.classList.remove('u4bd-active');
        });
        if (dom.resultsSlide) dom.resultsSlide.classList.remove('u4bd-active');

        if (num > state.totalQuestions) {
            showResults();
        } else {
            const targetSlide = dom.container.querySelector('.u4bd-question[data-id="' + num + '"]');
            if (targetSlide) {
                targetSlide.classList.add('u4bd-active');
            }
            state.currentQuestion = num;
            updateCounter();
            updateProgress();
        }
    }

    function showResults() {
        if (dom.resultsSlide) dom.resultsSlide.classList.add('u4bd-active');

        // Calculate score
        let correctCount = 0;
        for (let i = 1; i <= state.totalQuestions; i++) {
            const slide = dom.container.querySelector('.u4bd-question[data-id="' + i + '"]');
            if (!slide) continue;
            const correctAnswer = slide.getAttribute('data-answer');
            if (state.answers[i] === correctAnswer) {
                correctCount++;
            }
        }

        const percent = Math.round((correctCount / state.totalQuestions) * 100);
        let emoji = '';
        let message = '';

        if (percent >= 90) {
            emoji = '';
            message = 'Excellent! You understood the dialogue perfectly! / Excellent ! Tu as parfaitement compris le dialogue !';
        } else if (percent >= 70) {
            emoji = '';
            message = 'Great work! You understood most of the dialogue! / Bravo ! Tu as compris la plupart du dialogue !';
        } else if (percent >= 50) {
            emoji = '';
            message = 'Good effort! Review the dialogue and try again. / Bon effort ! Relis le dialogue et réessaie.';
        } else if (percent >= 30) {
            emoji = '';
            message = 'Keep studying! Read the dialogue again. / Continue à étudier ! Relis le dialogue.';
        } else {
            emoji = '';
            message = "Don't give up! Read the dialogue carefully and try again. / N'abandonne pas ! Lis le dialogue attentivement et réessaie.";
        }

        document.getElementById('u4bd-results-emoji').textContent = emoji;
        document.getElementById('u4bd-results-score').textContent = correctCount + ' / ' + state.totalQuestions + ' (' + percent + '%)';
        document.getElementById('u4bd-results-message').textContent = message;

        if (dom.counterEl) dom.counterEl.textContent = 'Results / Résultats';
        if (dom.progressFill) dom.progressFill.style.width = '100%';
    }

    function findSlideFromButton(btn) {
        let node = btn;
        while (node) {
            if (node.classList && node.classList.contains('u4bd-question')) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    function handleChoiceClick(e) {
        const btn = e.currentTarget;
        const slide = findSlideFromButton(btn);
        if (!slide) return;

        const questionId = slide.getAttribute('data-id');
        if (state.checked[questionId]) return; // Already checked

        // Deselect others
        const siblings = slide.querySelectorAll('.u4bd-choice');
        siblings.forEach(function (sib) {
            sib.classList.remove('u4bd-selected');
        });

        // Select this one
        btn.classList.add('u4bd-selected');
        state.answers[questionId] = btn.getAttribute('data-option');
    }

    function setFeedbackContent(feedbackEl, isCorrect, correctAnswer, feedbackText) {
        // Clear existing content
        feedbackEl.textContent = '';

        if (isCorrect) {
            // Create success message using DOM methods
            const checkmark = document.createTextNode('Correct! ');
            feedbackEl.appendChild(checkmark);
            feedbackEl.appendChild(document.createTextNode(feedbackText));
        } else {
            // Create error message with bold answer using DOM methods
            feedbackEl.appendChild(document.createTextNode('Incorrect. The answer is '));
            const strong = document.createElement('strong');
            strong.textContent = correctAnswer;
            feedbackEl.appendChild(strong);
            feedbackEl.appendChild(document.createTextNode('. ' + feedbackText));
        }
    }

    function handleCheckAnswer(questionId) {
        const slide = dom.container.querySelector('.u4bd-question[data-id="' + questionId + '"]');
        if (!slide) return;

        const correctAnswer = slide.getAttribute('data-answer');
        const feedbackText = slide.getAttribute('data-feedback');
        const feedback = document.getElementById('u4bd-feedback-' + questionId);
        const buttons = slide.querySelectorAll('.u4bd-choice');
        const userAnswer = state.answers[questionId];
        const checkBtn = document.getElementById('u4bd-check-' + questionId);
        const nextBtn = document.getElementById('u4bd-next-' + questionId);

        if (!userAnswer) {
            if (feedback) {
                feedback.textContent = "Please select an answer first! / Sélectionne une réponse d'abord !";
                feedback.classList.remove('u4bd-success');
                feedback.classList.add('u4bd-show', 'u4bd-error');
            }
            return;
        }

        state.checked[questionId] = true;
        if (checkBtn) checkBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = false;

        buttons.forEach(function (btn) {
            const opt = btn.getAttribute('data-option');
            btn.disabled = true;

            if (opt === correctAnswer) {
                btn.classList.add('u4bd-correct-choice');
            } else if (opt === userAnswer && userAnswer !== correctAnswer) {
                btn.classList.add('u4bd-wrong-choice');
            }
        });

        if (feedback) {
            const isCorrect = userAnswer === correctAnswer;
            setFeedbackContent(feedback, isCorrect, correctAnswer, feedbackText);
            feedback.classList.remove(isCorrect ? 'u4bd-error' : 'u4bd-success');
            feedback.classList.add('u4bd-show', isCorrect ? 'u4bd-success' : 'u4bd-error');
        }
    }

    function resetQuiz() {
        state.currentQuestion = 1;
        state.answers = {};
        state.checked = {};
        if (dom.container) dom.container.classList.remove('u4bd-review-mode');

        const slides = dom.container.querySelectorAll('.u4bd-question');
        slides.forEach(function (slide) {
            const questionId = slide.getAttribute('data-id');
            const feedback = document.getElementById('u4bd-feedback-' + questionId);
            const buttons = slide.querySelectorAll('.u4bd-choice');
            const checkBtn = document.getElementById('u4bd-check-' + questionId);
            const nextBtn = document.getElementById('u4bd-next-' + questionId);

            if (feedback) {
                feedback.classList.remove('u4bd-show', 'u4bd-success', 'u4bd-error');
                feedback.textContent = '';
            }

            buttons.forEach(function (btn) {
                btn.classList.remove('u4bd-selected', 'u4bd-correct-choice', 'u4bd-wrong-choice');
                btn.disabled = false;
            });

            if (checkBtn) checkBtn.disabled = false;
            if (nextBtn) nextBtn.disabled = true;
        });

        showSlide(1);
    }

    // ========== ATTACH DIRECT LISTENERS ==========
    function attachEvents() {
        if (!dom.container) return;

        // 1. Choices
        const choices = dom.container.querySelectorAll('.u4bd-choice');
        choices.forEach(function (btn) {
            btn.addEventListener('click', handleChoiceClick);
        });

        // 2. Control Buttons
        for (let i = 1; i <= state.totalQuestions; i++) {

            // Check button
            const checkBtn = document.getElementById('u4bd-check-' + i);
            if (checkBtn) {
                checkBtn.addEventListener('click', function () { handleCheckAnswer(i); });
            }

            // Next button
            const nextBtn = document.getElementById('u4bd-next-' + i);
            if (nextBtn) {
                nextBtn.addEventListener('click', function () { showSlide(i + 1); });
            }

            // Prev button
            const prevBtn = document.getElementById('u4bd-prev-' + i);
            if (prevBtn) {
                prevBtn.addEventListener('click', function () { showSlide(i - 1); });
            }
        }

        // 3. Review / Restart
        const reviewBtn = document.getElementById('u4bd-review-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', function () {
                if (dom.container) dom.container.classList.add('u4bd-review-mode');
                showSlide(1);
            });
        }

        const restartBtn = document.getElementById('u4bd-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', resetQuiz);
        }
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init: init,
        reset: resetQuiz
    };

})();
