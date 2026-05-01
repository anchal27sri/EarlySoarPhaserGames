export class HanoiModel {
  constructor(diskCount) {
    this.diskCount = diskCount;
    this.pegs = [[], [], []];
    this.moveCount = 0;
    this.minMoves = Math.pow(2, diskCount) - 1;

    // Initialize: all disks on peg 0, largest (diskCount) at bottom
    for (let i = diskCount; i >= 1; i--) {
      this.pegs[0].push(i);
    }
  }

  topDisk(pegIndex) {
    const peg = this.pegs[pegIndex];
    return peg.length > 0 ? peg[peg.length - 1] : null;
  }

  canMove(fromPeg, toPeg) {
    if (fromPeg === toPeg) return false;
    const from = this.topDisk(fromPeg);
    if (from === null) return false;
    const to = this.topDisk(toPeg);
    return to === null || from < to;
  }

  move(fromPeg, toPeg) {
    if (!this.canMove(fromPeg, toPeg)) return false;
    const disk = this.pegs[fromPeg].pop();
    this.pegs[toPeg].push(disk);
    this.moveCount++;
    return true;
  }

  isWin() {
    return this.pegs[2].length === this.diskCount;
  }

  diskCountOnPeg(pegIndex) {
    return this.pegs[pegIndex].length;
  }

  reset(diskCount) {
    this.diskCount = diskCount || this.diskCount;
    this.pegs = [[], [], []];
    this.moveCount = 0;
    this.minMoves = Math.pow(2, this.diskCount) - 1;
    for (let i = this.diskCount; i >= 1; i--) {
      this.pegs[0].push(i);
    }
  }
}
