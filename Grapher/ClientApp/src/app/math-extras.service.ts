import { Injectable } from '@angular/core';
import { create, all, BigNumber, MathJsStatic } from 'mathjs';

@Injectable({
  providedIn: 'root'
})

export class MathExtrasService {
  config: math.ConfigOptions = {
    epsilon: 1e-32,
    matrix: 'Matrix',
    number: 'BigNumber',
    precision: 64,
    predictable: false,
    randomSeed: null
  };
  math: MathJsStatic = create(all, this.config);

  constructor() { }

  // Below are several comparer functions. From MathJS docs, comparer functions cannot 
  // accurately compare numbers smaller than 2.22e^-16. These are meant to fix that.
  isLessThan(leftNumber: BigNumber, rightNumber: BigNumber): boolean {
    return this.math.isNegative(leftNumber.minus(rightNumber));
  }

  isLessThanOrEqualTo(leftNumber: BigNumber, rightNumber: BigNumber, epsilon: BigNumber): boolean {
    if (this.isEqual(leftNumber, rightNumber, epsilon)) {
      return true;
    }

    return this.isLessThan(leftNumber, rightNumber);
  }

  isEqual(leftNumber: BigNumber, rightNumber: BigNumber, epsilon: BigNumber): boolean {
    if (leftNumber.toString() === rightNumber.toString()) {
      return true;
    }

    return this.isLessThan(this.math.abs(leftNumber.minus(rightNumber)), epsilon);
  }

  isGreaterThanOrEqualTo(leftNumber: BigNumber, rightNumber: BigNumber, epsilon: BigNumber): boolean {
    if (this.isEqual(leftNumber, rightNumber, epsilon)) {
      return true;
    }

    return this.isGreaterThan(leftNumber, rightNumber);
  }

  isGreaterThan(leftNumber: BigNumber, rightNumber: BigNumber): boolean {
    return this.math.isPositive(leftNumber.minus(rightNumber));
  }
}
