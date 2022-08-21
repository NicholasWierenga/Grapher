import { Injectable } from '@angular/core';
import { create, all, BigNumber, MathJsStatic } from 'mathjs';
import * as PlotlyJS from 'plotly.js-dist-min';
import { MathExtrasService } from './math-extras.service';
import { Point } from './point';

@Injectable({
  providedIn: 'root'
})

export class TestService {
  xWindowLowerString!: string;
  xWindowUpperString!: string;
  yWindowLowerString!: string;
  yWindowUpperString!: string;
  xStepsString!: string;
  yStepsString!: string;
  math: MathJsStatic = this.mathExtras.math;
  xStepDelta: BigNumber = this.math.bignumber("-1");
  yStepDelta: BigNumber = this.math.bignumber("-1");
  graphData: PlotlyJS.Data[] = [];
  graphType: string = "";
  newPointsFoundCount: number = -1;
  savedPointsFoundCount: number = -1;
  totalPointsUsed: number = -1;

  constructor(private mathExtras: MathExtrasService) { }

  // After a trace is added, this is ran to check data that would indicate where a problem is coming from.
  // When an error is found, the console prints out what was found and associated variables.
  checkForProblems(points: Point[], equation: string): void {
    let trace: Partial<PlotlyJS.PlotData> = this.graphData[this.graphData.length - 1];
    // Checks for if the amount of points is correct.
    if (this.graphType === "2D") {
      if (trace.x!.length !== parseInt(this.xStepsString) + 1) {
        console.log("\nThere was an error. The amount of lines for the 2D plot isn't the correct amount.");
        console.log(`Correct number should be ${parseInt(this.xStepsString) + 1}. 
        The number found is ${trace.x!.length}.`);
      }

      if (trace.x!.length !== points.length) {
        console.log("\nThere was an error. The amount of lines for the 2D plot isn't the correct amount.");
        console.log(`points has ${points.length}. 
        The number of points in trace is ${trace.x!.length}.`);
      }
    }

    if (this.graphType === "3D") {
      let numberOfLines: number = trace.x!.length;
      let numberOfPoints: number[] = [];

      for (var i = 0; i < trace.x!.length; i++) {
        numberOfPoints.push(trace.y![i]!.toString().split(",").length);
      }

      if (points.length !== (parseInt(this.xStepsString) + 1)
      * (parseInt(this.yStepsString) + 1)) {
        console.log(`\nThere was an error. this.totalPointsFoundCount isn't the same as the amount of points there should be.`);
        console.log(`Correct amount should be: ${(parseInt(this.xStepsString) + 1) 
        * (parseInt(this.yStepsString) + 1)}. 
          points is: ${points.length}.`);
      }

      if (numberOfLines !== (parseInt(this.xStepsString) + 1)) {
        console.log("\nThere was an error. There is an incorrect number of lines that should be in this graph");
        console.log(`The number of lines are ${numberOfLines}. The amount that there should be is: 
        ${parseInt(this.xStepsString) + 1}.`);
      }

      if (numberOfPoints.findIndex(pointCount => pointCount !== (parseInt(this.yStepsString) + 1)) !== -1) {
        console.log("\nThere was an error. There is an incorrect number of points on each line.");
        console.log(`The number of points per line is found below. The amount that there should be is: 
        ${parseInt(this.yStepsString) + 1}.`);
        console.log(numberOfPoints);
      }
    }

    // Checks for issues in with how the data is sorted.
    if (this.graphType === "2D") {
      if ([...trace.x!][0]?.toString().split(",")[0] !== this.xWindowLowerString) {
        console.log("\nThere was an error. The data passed to the graph should be sorted, but it wasn't.");
        console.log([...trace.x!][0]?.toString().split(",")[0]);
        console.log(`Trace-number found: ${[...trace.x!][0]?.toString().split(",")[0]}. 
        Lower x-window is: ${this.xWindowLowerString}.`);
      }

      if (trace.x![parseInt(this.xStepsString)] !== this.xWindowUpperString) {
        console.log("\nThere was an error. The data passed to the graph should be sorted, but it wasn't.");
        console.log(`Trace-number found: ${trace.x![parseInt(this.xStepsString)]}. 
        Upper x-window is: ${this.xWindowUpperString}.`);
      }
    }

    if (this.graphType === "3D") {
      let beginningXValues: string[] = [];
      let endingXValues: string[] = [];
      let beginningYValues: string[] = [];
      let endingYValues: string[] = [];

      for (var i = 0; i < trace.x!.length; i++) {
        beginningXValues.push(trace.x![i]!.toString().split(",")[0]);
      }

      for (var i = 0; i < trace.x!.length; i++) {
        endingXValues.push(trace.x![i]!.toString().split(",")[parseInt(this.xStepsString)]);
      }

      for (var i = 0; i < trace.y!.length; i++) {
        beginningYValues.push(trace.y![0]!.toString().split(",")[i]);
      }

      for (var i = 0; i < trace.y!.length; i++) {
        endingYValues.push(trace.y![parseInt(this.yStepsString)]!.toString().split(",")[i]);
      }

      if (beginningXValues.findIndex(beginXVal => beginXVal !== this.xWindowLowerString) !== -1) {
        console.log("\nThere was an error. Beginning x-values were not sorted.");
        console.log(`Beginning x-values are below.`);
        console.log(beginningXValues);
      }

      if (endingXValues.findIndex(endXVal => endXVal !== this.xWindowUpperString) !== -1) {
        console.log("\nThere was an error. Ending x-values were not sorted.");
        console.log(`Ending x-values are below.`);
        console.log(endingXValues);
      }

      if (beginningYValues.findIndex(beginYVal => beginYVal !== this.yWindowLowerString) !== -1) {
        console.log("\nThere was an error. Beginning y-values were not sorted.");
        console.log(`Beginning y-values are below.`);
        console.log(beginningYValues);
      }

      if (endingYValues.findIndex(endYVal => endYVal !== this.yWindowUpperString) !== -1) {
        console.log("\nThere was an error. Ending y-values were not sorted.");
        console.log(`Ending y-values are below.`);
        console.log(endingYValues);
      }
    }

    if (!equation.includes("y = ") && this.graphType === "2D") {
      console.log("\nThere was an error. This is not an equation.");
      console.log(`The equation that was used: ${equation}.`);
    }

    if (!equation.includes("z = ") && this.graphType === "3D") {
      console.log("\nThere was an error. This is not an equation.");
      console.log(`The equation that was used: ${equation}.`);
    }
  }

  // This is used to test the functions found in mathExtras. MathJS comparer functions don't work for numbers
  // that are smaller than 2.22e-16, so the program uses its own set of comparers.
  testMath(): void {
    let epsilon: BigNumber = this.math.bignumber("1e-32");

    // isLessThan tests
    if (this.mathExtras.isLessThan(this.math.bignumber("1e-17"), this.math.bignumber("1e-32"))) {
      console.log(this.mathErrorReport("isLessThan", this.math.bignumber("1e-17"), this.math.bignumber("1e-32")));
    }

    if (this.mathExtras.isLessThan(this.math.bignumber("-55"), this.math.bignumber("-55"))) {
      console.log(this.mathErrorReport("isLessThan", this.math.bignumber("-55"), this.math.bignumber("-55")));
    }

    if (!this.mathExtras.isLessThan(this.math.bignumber("-55"), this.math.bignumber("55"))) {
      console.log(this.mathErrorReport("isLessThan", this.math.bignumber("-55"), this.math.bignumber("55")));
    }

    if (this.mathExtras.isLessThan(this.math.bignumber("555"), this.math.bignumber("-1e-55"))) {
      console.log(this.mathErrorReport("isLessThan", this.math.bignumber("555"), this.math.bignumber("-1e-55")));
    }

    // isLessThanOrEqualTo tests
    if (this.mathExtras.isLessThanOrEqualTo(this.math.bignumber("1e-17"), this.math.bignumber("1e-32"), epsilon)) {
      console.log(this.mathErrorReport("isLessThanOrEqualTo", this.math.bignumber("1e-17"), this.math.bignumber("1e-32"), epsilon));
    }

    if (!this.mathExtras.isLessThanOrEqualTo(this.math.bignumber("-55"), this.math.bignumber("-55"), epsilon)) {
      console.log(this.mathErrorReport("isLessThanOrEqualTo", this.math.bignumber("-55"), this.math.bignumber("-55"), epsilon));
    }

    if (!this.mathExtras.isLessThanOrEqualTo(this.math.bignumber("-55"), this.math.bignumber("55"), epsilon)) {
      console.log(this.mathErrorReport("isLessThanOrEqualTo", this.math.bignumber("-55"), this.math.bignumber("55"), epsilon));
    }

    if (this.mathExtras.isLessThanOrEqualTo(this.math.bignumber("555"), this.math.bignumber("-1e-55"), epsilon)) {
      console.log(this.mathErrorReport("isLessThanOrEqualTo", this.math.bignumber("555"), this.math.bignumber("-1e-55"), epsilon));
    }

    // isEqual tests
    if (!this.mathExtras.isEqual(this.math.bignumber("1e-33"), this.math.bignumber("1e-32"), epsilon)) {
      console.log(this.mathErrorReport("isEqual", this.math.bignumber("1e-33"), this.math.bignumber("1e-32"), epsilon));
    }

    if (this.mathExtras.isEqual(this.math.bignumber("4"), this.math.bignumber("1e-62"), epsilon)) {
      console.log(this.mathErrorReport("isEqual", this.math.bignumber("4"), this.math.bignumber("1e-62"), epsilon));
    }

    if (this.mathExtras.isEqual(this.math.bignumber("-32.351234e-555"), this.math.bignumber("100000000000"), epsilon)) {
      console.log(this.mathErrorReport("isEqual", this.math.bignumber("-32.351234e-555"), this.math.bignumber("100000000000"), epsilon));
    }

    if (this.mathExtras.isEqual(this.math.bignumber("312.452e10"), this.math.bignumber("100000000000"), epsilon)) {
      console.log(this.mathErrorReport("isEqual", this.math.bignumber("312.452e10"), this.math.bignumber("100000000000"), epsilon));
    }

    // isGreaterThanOrEqualTo tests
    if (!this.mathExtras.isGreaterThanOrEqualTo(this.math.bignumber("1e-17"), this.math.bignumber("1e-32"), epsilon)) {
      console.log(this.mathErrorReport("isGreaterThanOrEqualTo", this.math.bignumber("1e-17"), this.math.bignumber("1e-32"), epsilon));
    }

    if (!this.mathExtras.isGreaterThanOrEqualTo(this.math.bignumber("-55"), this.math.bignumber("-55"), epsilon)) {
      console.log(this.mathErrorReport("isGreaterThanOrEqualTo", this.math.bignumber("-55"), this.math.bignumber("-55"), epsilon));
    }

    if (this.mathExtras.isGreaterThanOrEqualTo(this.math.bignumber("-1e-55"), this.math.bignumber("55"), epsilon)) {
      console.log(this.mathErrorReport("isGreaterThanOrEqualTo", this.math.bignumber("-1e-55"), this.math.bignumber("55"), epsilon));
    }

    if (!this.mathExtras.isGreaterThanOrEqualTo(this.math.bignumber("555"), this.math.bignumber("-1e-55"), epsilon)) {
      console.log(this.mathErrorReport("isGreaterThanOrEqualTo", this.math.bignumber("555"), this.math.bignumber("-1e-55"), epsilon));
    }

    // isGreaterThan tests
    if (!this.mathExtras.isGreaterThan(this.math.bignumber("1e-33"), this.math.bignumber("-1e-33"))) {
      console.log(this.mathErrorReport("isGreaterThan", this.math.bignumber("1e-33"), this.math.bignumber("-1e-33")));
    }

    if (!this.mathExtras.isGreaterThan(this.math.bignumber("0"), this.math.bignumber("-1e-27"))) {
      console.log(this.mathErrorReport("isGreaterThan", this.math.bignumber("0"), this.math.bignumber("-1e-27")));
    }

    if (!this.mathExtras.isGreaterThan(this.math.bignumber("-1e-55"), this.math.bignumber("-2"))) {
      console.log(this.mathErrorReport("isGreaterThan", this.math.bignumber("-1e-55"), this.math.bignumber("-2")));
    }

    if (this.mathExtras.isGreaterThan(this.math.bignumber("-1e-55"), this.math.bignumber("555"))) {
      console.log(this.mathErrorReport("isGreaterThan", this.math.bignumber("-1e-55"), this.math.bignumber("555")));
    }
  }

  mathErrorReport(functionName: string, firstNumber: BigNumber, secondNumber: BigNumber, epsilonUsed?: BigNumber): string {
    let errorMessage = `An error occurred with ${functionName}. The numbers used were ${firstNumber.toString()} 
    and ${secondNumber.toString()}.`;

    if (epsilonUsed !== undefined) {
      errorMessage += ` The epsilon used was ${epsilonUsed.toString()}.`
    }

    return errorMessage;
  }
}