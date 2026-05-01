export class CountingModel {
  constructor(totalRounds = 20) {
    this.totalRounds = totalRounds;
    this.currentRound = 0;
    this.score = 0;
    this.ringCount = 0;
    this.ringsOnPeg = 0;
  }

  startRound() {
    this.currentRound++;
    this.ringCount = 3 + Math.floor(Math.random() * 6); // 3–8
    this.ringsOnPeg = 0;
    return this.ringCount;
  }

  repeatRound() {
    this.ringsOnPeg = 0;
  }

  placeRing() {
    this.ringsOnPeg++;
    return this.ringsOnPeg >= this.ringCount;
  }

  generateOptions() {
    const correct = this.ringCount;
    const options = new Set([correct]);
    while (options.size < 3) {
      let wrong = correct + Math.floor(Math.random() * 7) - 3; // -3 to +3
      if (wrong < 1) wrong = correct + 1 + Math.floor(Math.random() * 3);
      if (wrong !== correct && wrong >= 1) options.add(wrong);
    }
    return [...options].sort(() => Math.random() - 0.5);
  }

  checkAnswer(answer) {
    if (answer === this.ringCount) {
      this.score++;
      return true;
    }
    return false;
  }

  isGameOver() {
    return this.currentRound >= this.totalRounds;
  }
}
