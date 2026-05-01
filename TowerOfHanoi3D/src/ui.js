const ui = {};

export function createUI() {
  // Round banner
  const roundBanner = document.createElement("div");
  roundBanner.id = "round-banner";
  roundBanner.innerHTML = "ROUND 1";
  Object.assign(roundBanner.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "linear-gradient(180deg, #e8a33a 0%, #c47d1a 100%)",
    color: "#fff",
    fontFamily: "'Fredoka One', 'Comic Sans MS', cursive, sans-serif",
    fontSize: "28px",
    fontWeight: "bold",
    padding: "10px 40px",
    borderRadius: "12px",
    border: "3px solid #a0621a",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
    letterSpacing: "3px",
    zIndex: "100",
    userSelect: "none",
  });
  document.body.appendChild(roundBanner);
  ui.roundBanner = roundBanner;

  // Options container (for Part 2)
  const optionsContainer = document.createElement("div");
  optionsContainer.id = "options-container";
  Object.assign(optionsContainer.style, {
    position: "fixed",
    right: "8%",
    top: "50%",
    transform: "translateY(-50%)",
    display: "none",
    flexDirection: "row",
    gap: "20px",
    zIndex: "100",
    userSelect: "none",
  });
  document.body.appendChild(optionsContainer);
  ui.optionsContainer = optionsContainer;

  // Feedback overlay
  const feedback = document.createElement("div");
  feedback.id = "feedback";
  Object.assign(feedback.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontFamily: "'Fredoka One', 'Comic Sans MS', cursive, sans-serif",
    fontSize: "48px",
    fontWeight: "bold",
    padding: "20px 50px",
    borderRadius: "16px",
    textShadow: "2px 2px 6px rgba(0,0,0,0.4)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
    zIndex: "200",
    display: "none",
    userSelect: "none",
  });
  document.body.appendChild(feedback);
  ui.feedback = feedback;

  return ui;
}

export function updateRound(round) {
  ui.roundBanner.innerHTML = `ROUND ${round}`;
}

export function updateScore(score) {
  // Score display removed
}

export function showOptions(correctCount, onSelect) {
  const container = ui.optionsContainer;
  container.innerHTML = "";
  container.style.display = "flex";

  // Generate 3 options: one correct, two wrong
  const options = new Set();
  options.add(correctCount);
  while (options.size < 3) {
    const wrong = correctCount + (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
    if (wrong > 0) options.add(wrong);
  }

  const shuffled = [...options].sort(() => Math.random() - 0.5);

  shuffled.forEach((num) => {
    const btn = document.createElement("div");
    btn.innerHTML = num;
    Object.assign(btn.style, {
      width: "90px",
      height: "90px",
      backgroundImage: "url('integer_options_background.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      color: "#fff",
      fontFamily: "'Fredoka One', 'Comic Sans MS', cursive, sans-serif",
      fontSize: "40px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "14px",
      border: "none",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      cursor: "pointer",
      textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
      transition: "transform 0.1s",
    });
    btn.addEventListener("pointerenter", () => {
      btn.style.transform = "scale(1.1)";
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "scale(1)";
    });
    btn.addEventListener("pointerdown", () => {
      onSelect(num);
    });
    container.appendChild(btn);
  });
}

export function hideOptions() {
  ui.optionsContainer.style.display = "none";
  ui.optionsContainer.innerHTML = "";
}

export function showFeedback(correct) {
  const fb = ui.feedback;
  fb.innerHTML = correct ? "CORRECT!" : "TRY AGAIN!";
  fb.style.display = "block";
  fb.style.background = correct
    ? "linear-gradient(180deg, #4de89a 0%, #28a06d 100%)"
    : "linear-gradient(180deg, #e85a5a 0%, #b03030 100%)";
  fb.style.color = "#fff";

  setTimeout(() => {
    fb.style.display = "none";
  }, 1200);
}

export function showGameOver(score) {
  const fb = ui.feedback;
  fb.innerHTML = `GAME OVER!<br><span style="font-size:28px">Score: ${score}/20</span>`;
  fb.style.display = "block";
  fb.style.background = "linear-gradient(180deg, #e8a33a 0%, #c47d1a 100%)";
  fb.style.color = "#fff";
}
