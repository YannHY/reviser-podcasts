(function quizRuntime() {
  const shared = window.BacPodcastUtils;
  const quizzes = window.quizData || [];
  const quiz = quizzes.find((item) => item.id === window.QUIZ_ID);
  const root = document.querySelector('#quizRoot');
  const title = document.querySelector('#quizTitle');
  const meta = document.querySelector('#quizMeta');
  const checkBtn = document.querySelector('#checkBtn');
  const resetBtn = document.querySelector('#resetBtn');

  initTheme();

  if (!quiz) {
    root.innerHTML = '<p class="empty">Quiz introuvable.</p>';
    checkBtn.disabled = true;
    resetBtn.disabled = true;
    return;
  }

  document.title = 'Quiz - ' + frenchTypography(quiz.title);
  title.textContent = frenchTypography(quiz.title);
  meta.textContent = [quiz.work, quiz.duration, quiz.source, quiz.questions.length + ' questions'].filter(Boolean).join(' • ');

  renderQuiz();

  checkBtn.addEventListener('click', checkQuiz);
  resetBtn.addEventListener('click', () => {
    renderQuiz();
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function initTheme() {
    if (shared?.applyTheme && shared?.getSavedTheme) {
      shared.applyTheme(shared.getSavedTheme());
      return;
    }

    try {
      if (localStorage.getItem('bac-podcasts-theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (error) {}
  }

  function renderQuiz() {
    root.innerHTML = '';
    quiz.questions.forEach((question, questionIndex) => {
      const article = document.createElement('article');
      article.className = 'quiz-question';

      const fieldset = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = `${questionIndex + 1}. ${frenchTypography(question.prompt)}`;
      fieldset.append(legend);

      const choices = document.createElement('div');
      choices.className = 'quiz-choices';

      question.choices.forEach((choice, choiceIndex) => {
        const id = `q${questionIndex}-c${choiceIndex}`;
        const label = document.createElement('label');
        label.className = 'quiz-choice';
        label.htmlFor = id;

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `q${questionIndex}`;
        input.id = id;
        input.value = String(choiceIndex);

        const letter = document.createElement('span');
        letter.className = 'choice-letter';
        letter.textContent = String.fromCharCode(65 + choiceIndex);

        const text = document.createElement('span');
        text.textContent = frenchTypography(choice);

        label.append(input, letter, text);
        choices.append(label);
      });

      const feedback = document.createElement('p');
      feedback.className = 'quiz-feedback';
      feedback.id = `feedback-${questionIndex}`;

      fieldset.append(choices);
      article.append(fieldset, feedback);
      root.append(article);
    });

    const score = document.createElement('p');
    score.className = 'quiz-score';
    score.id = 'score';
    score.textContent = 'Répondez aux questions, puis lancez la correction.';
    root.append(score);
  }

  function checkQuiz() {
    let correct = 0;

    quiz.questions.forEach((question, questionIndex) => {
      const selected = root.querySelector(`input[name="q${questionIndex}"]:checked`);
      const labels = [...root.querySelectorAll(`input[name="q${questionIndex}"]`)].map((input) => input.closest('.quiz-choice'));
      labels.forEach((label) => label.classList.remove('is-correct', 'is-incorrect'));

      const selectedIndex = selected ? Number(selected.value) : -1;
      const feedback = root.querySelector(`#feedback-${questionIndex}`);
      labels[question.answer].classList.add('is-correct');

      if (selectedIndex === question.answer) {
        correct += 1;
        feedback.textContent = `Correct. ${frenchTypography(question.feedback)}`;
      } else if (selectedIndex >= 0) {
        labels[selectedIndex].classList.add('is-incorrect');
        feedback.textContent = `À revoir. ${frenchTypography(question.feedback)}`;
      } else {
        feedback.textContent = `Sans réponse. ${frenchTypography(question.feedback)}`;
      }
    });

    root.querySelector('#score').textContent = `Score : ${correct} / ${quiz.questions.length}`;
  }

  const yearEl = document.getElementById('current-year');
  if (shared?.setCurrentYear) {
    shared.setCurrentYear();
  } else if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  function frenchTypography(value) {
    if (shared?.frenchTypography) return shared.frenchTypography(value);
    return String(value)
      .replace(/([^\s:;?!/])[\t \u00a0\u202f]*([:;?!])(?!\/)/g, '$1\u202f$2');
  }
})();
