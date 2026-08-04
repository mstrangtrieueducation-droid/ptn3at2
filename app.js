(() => {
  const unit = window.GRAMMAR_UNIT;

  if (!unit) {
    document.body.textContent = "Không tìm thấy dữ liệu bài học.";
    return;
  }

  const lessons = unit.lessons;
  const practicePrompts = unit.practice;
  const sharedAudio = new Audio();
  const timings = window.GRAMMAR_AUDIO_TIMINGS ?? {};
  let lessonIndex = 0;
  let practiceIndex = 0;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const audioId = (index) => `read-${String(index + 1).padStart(2, "0")}`;
  const imagePath = (filename) => `assets/images/${filename}`;

  function setUnitIdentity() {
    const heading = `${unit.display}: ${unit.title}`;
    document.title = `FF1 ${heading} | Grammar Practice`;
    $("#unitHeading").textContent = heading;
    $("#introVisual").src = imagePath(unit.overviewImage);
    $("#introVisual").alt = `Hình từ vựng ${heading}`;
    $("#practiceVisual").src = imagePath(unit.overviewImage);
    $("#practiceVisual").alt = `Hình từ vựng ${heading}`;
  }

  function renderKaraokeSentence(sentence) {
    const container = $("#lessonExample");
    container.replaceChildren();
    sentence.split(/\s+/).forEach((word) => {
      const span = document.createElement("span");
      span.textContent = word;
      container.append(span);
    });
  }

  function clearKaraoke() {
    $$("#lessonExample span").forEach((word) => {
      word.classList.remove("is-speaking");
    });
  }

  function highlightLessonWord(id) {
    const words = $$("#lessonExample span");
    const boundaries = timings[id] ?? [];
    let activeIndex = -1;

    if (boundaries.length === words.length) {
      for (let index = 0; index < boundaries.length; index += 1) {
        if (sharedAudio.currentTime >= boundaries[index].start) {
          activeIndex = index;
        }
      }
    } else if (Number.isFinite(sharedAudio.duration) && sharedAudio.duration > 0) {
      const progress = sharedAudio.currentTime / sharedAudio.duration;
      activeIndex = Math.min(words.length - 1, Math.floor(progress * words.length));
    }

    words.forEach((word, index) => {
      word.classList.toggle("is-speaking", index === activeIndex);
    });
  }

  function stopAudio() {
    sharedAudio.pause();
    sharedAudio.currentTime = 0;
    sharedAudio.ontimeupdate = null;
    sharedAudio.onended = null;
    sharedAudio.onerror = null;
    clearKaraoke();
    $("#playLesson").textContent = "▶ Nghe câu mẫu tiếng Anh";
  }

  function playEnglishExample(id) {
    stopAudio();
    sharedAudio.src = `assets/audio/${id}.mp3`;
    $("#playLesson").textContent = "Đang phát câu mẫu...";

    const finish = () => {
      sharedAudio.ontimeupdate = null;
      sharedAudio.onended = null;
      sharedAudio.onerror = null;
      clearKaraoke();
      $("#playLesson").textContent = "▶ Nghe câu mẫu tiếng Anh";
    };

    sharedAudio.ontimeupdate = () => highlightLessonWord(id);
    sharedAudio.onended = finish;
    sharedAudio.onerror = finish;
    sharedAudio.play().catch((error) => {
      console.warn("Audio playback failed:", error?.name || error);
      finish();
    });
  }

  function selectView(viewName) {
    stopAudio();
    $$(".mode-tabs button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === viewName);
    });
    $$(".view").forEach((view) => view.classList.remove("is-active"));
    $(`#${viewName}View`).classList.add("is-active");
  }

  function renderDots(container, count, current, onSelect) {
    container.replaceChildren();
    for (let index = 0; index < count; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1);
      button.classList.toggle("is-active", index === current);
      button.setAttribute("aria-label", `Mở phần ${index + 1}`);
      button.addEventListener("click", () => onSelect(index));
      container.append(button);
    }
  }

  function renderLesson() {
    stopAudio();
    const lesson = lessons[lessonIndex];
    $("#lessonNumber").textContent = String(lessonIndex + 1);
    $("#lessonTotal").textContent = String(lessons.length);
    $("#lessonProgress").style.width = `${((lessonIndex + 1) / lessons.length) * 100}%`;
    $("#lessonTag").textContent = lesson.tag;
    $("#lessonTitle").textContent = lesson.title;
    $("#lessonNote").textContent = lesson.note;
    $("#lessonFormula").innerHTML = lesson.formula
      .map((row) => `<div class="formula-row">${row}</div>`)
      .join("");
    renderKaraokeSentence(lesson.example);
    $("#visualLabel").textContent = lesson.label;
    $("#lessonVisual").src = imagePath(lesson.visual);
    $("#lessonVisual").alt = lesson.label;

    renderDots($("#lessonDots"), lessons.length, lessonIndex, (index) => {
      lessonIndex = index;
      renderLesson();
    });
  }

  function createVocabularyImage(cue, compact = false) {
    const frame = document.createElement("span");
    frame.className = "cue-image";
    if (compact) frame.classList.add("is-compact");

    const image = document.createElement("img");
    image.src = imagePath(cue.image);
    image.alt = cue.alt || "Hình từ vựng";
    image.loading = "eager";
    frame.append(image);
    return frame;
  }

  function renderCueList(container, cues) {
    container.replaceChildren();
    cues.forEach((cue, index) => {
      if (index > 0) {
        const plus = document.createElement("span");
        plus.className = "cue-plus";
        plus.textContent = "+";
        container.append(plus);
      }

      if (typeof cue === "object" && cue.image) {
        container.append(createVocabularyImage(cue));
        return;
      }

      const chip = document.createElement("span");
      chip.className = "cue-chip";
      chip.textContent = cue;
      container.append(chip);
    });
  }

  function renderIntroExample() {
    renderCueList($("#introExampleCues"), unit.introExample.cues);
    $("#introExampleAnswer").textContent = unit.introExample.answer;
  }

  function renderAnswerSheet() {
    const answerGroups = $("#answerGroups");
    answerGroups.replaceChildren();
    const groups = new Map();

    practicePrompts.forEach((prompt, index) => {
      if (!groups.has(prompt.group)) groups.set(prompt.group, []);
      groups.get(prompt.group).push({ prompt, index });
    });

    groups.forEach((items, groupName) => {
      const section = document.createElement("section");
      section.className = "answer-group";

      const heading = document.createElement("h3");
      heading.textContent = groupName;
      section.append(heading);

      const list = document.createElement("ol");
      list.className = "answer-list";
      list.start = items[0].index + 1;

      items.forEach(({ prompt }) => {
        const item = document.createElement("li");
        const thumbnails = document.createElement("div");
        thumbnails.className = "answer-thumbnails";
        prompt.cues
          .filter((cue) => typeof cue === "object" && cue.image)
          .forEach((cue) => {
            thumbnails.append(createVocabularyImage(cue, true));
          });

        const answer = document.createElement("p");
        answer.textContent = prompt.answer;
        const row = document.createElement("div");
        row.className = "answer-row";
        row.append(thumbnails, answer);
        item.append(row);
        list.append(item);
      });

      section.append(list);
      answerGroups.append(section);
    });
  }

  function setPracticeTotals() {
    $$("[data-practice-total]").forEach((element) => {
      element.textContent = String(practicePrompts.length);
    });
  }

  function renderPracticePrompt() {
    const prompt = practicePrompts[practiceIndex];
    const number = practiceIndex + 1;
    $("#practiceNumber").textContent = String(number);
    $("#practiceStageNumber").textContent = String(number);
    $("#practiceProgress").style.width = `${(number / practicePrompts.length) * 100}%`;
    $("#promptType").textContent = prompt.type;
    $("#promptInstruction").textContent = prompt.instruction;
    $("#practiceVisual").src = imagePath(prompt.visual);
    $("#practiceVisual").alt = `Hình gợi ý câu ${number}`;
    $("#previousPrompt").disabled = practiceIndex === 0;
    $("#nextPrompt").textContent =
      practiceIndex === practicePrompts.length - 1
        ? "Hoàn thành ✓"
        : "Câu tiếp theo ›";

    const cueList = document.createElement("div");
    cueList.className = "cue-list";
    renderCueList(cueList, prompt.cues);
    $("#promptContent").replaceChildren(cueList);
  }

  function resetPractice() {
    practiceIndex = 0;
    $("#practiceComplete").hidden = true;
    $("#practiceStage").hidden = true;
    $("#practiceIntro").hidden = false;
    $("#practiceNumber").textContent = "0";
    $("#practiceProgress").style.width = "0%";
  }

  $$(".mode-tabs button").forEach((button) => {
    button.addEventListener("click", () => selectView(button.dataset.view));
  });

  $("#playLesson").addEventListener("click", () => {
    playEnglishExample(audioId(lessonIndex));
  });

  $("#previousLesson").addEventListener("click", () => {
    lessonIndex = (lessonIndex - 1 + lessons.length) % lessons.length;
    renderLesson();
  });

  $("#nextLesson").addEventListener("click", () => {
    lessonIndex = (lessonIndex + 1) % lessons.length;
    renderLesson();
  });

  $("#startPractice").addEventListener("click", () => {
    practiceIndex = 0;
    $("#practiceIntro").hidden = true;
    $("#practiceComplete").hidden = true;
    $("#practiceStage").hidden = false;
    renderPracticePrompt();
  });

  $("#previousPrompt").addEventListener("click", () => {
    if (practiceIndex === 0) return;
    practiceIndex -= 1;
    renderPracticePrompt();
  });

  $("#nextPrompt").addEventListener("click", () => {
    if (practiceIndex < practicePrompts.length - 1) {
      practiceIndex += 1;
      renderPracticePrompt();
      return;
    }

    $("#practiceStage").hidden = true;
    $("#practiceComplete").hidden = false;
    $("#practiceNumber").textContent = String(practicePrompts.length);
    $("#practiceProgress").style.width = "100%";
    $("#practiceComplete").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#restartPractice").addEventListener("click", resetPractice);

  setUnitIdentity();
  setPracticeTotals();
  renderIntroExample();
  renderAnswerSheet();
  renderLesson();
  $("#practiceProgress").style.width = "0%";
})();
