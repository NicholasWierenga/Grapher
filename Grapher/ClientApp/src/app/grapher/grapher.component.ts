import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';
import { Point } from '../point';
import { Chart, registerables } from 'chart.js';
import { create, all } from 'mathjs';
import { BigNumber } from "bignumber.js";

@Component({
  selector: 'app-grapher',
  templateUrl: './grapher.component.html',
  styleUrls: ['./grapher.component.css']
})

export class GrapherComponent implements OnInit {
  // TODO: much of this should be passed directly to getGraphType later on.
  equation: string = "";
  xWindowLowerString: string = "";
  xWindowUpperString: string = "";
  yWindowLowerString: string = "";
  yWindowUpperString: string = "";
  xStepsString: string = "";
  yStepsString: string = "";
  xStepDelta!: BigNumber;
  yStepDelta!: BigNumber;
  pointsToGraph: Point[] = [];
  badEquation: boolean = false;
  math = create(all, {number: 'BigNumber'});
  myChart!: Chart<"line", string[], string>; 
  
  constructor(private graphService: GraphService) { 
    Chart.register(...registerables);
  }

  // TODO: This assumes users are only ever going to enter in functions with numbers, trig functions, x, or y.
  // Add things for users to graph with different variables like a or b then pass those variables to get3D/2DPoints functions.
  // Not that important to do and probably is decently complicated, since trig functions contain letters that might be used in the variable.
  // Probably try using something to check for sin(), cos(), tan(), cosh(), etc in expression then remove until new variables are found.
  getGraphType(): void {
    // MathJS allows us to graph things like y = x instead of just x, so we want only the expression
    // in order to determine what variables are being iterated through.
    let expression: string = this.equation.split("=")[this.equation.split("=").length - 1];
    this.xStepDelta = new BigNumber(this.xWindowUpperString).minus(this.xWindowLowerString).dividedBy(this.xStepsString);
    
    // We pass the expression to the function and not the equation because not doing so would
    // allow y = x and x to both be present in the database, which would be redudant.
    // TODO: This implies any function like y = a, y = b, or y = x should all be stored as x.
    // Consider swapping the new variable letters to being x or y and then saving those to the db,
    // which would save a bit of space and allow for a wider range of graphs getting already known points.
    switch (true) {
      case expression.includes("x") && expression.includes("y"): {
        console.log("function with x and y found");
        this.get3DPoints(expression);
        break;
      }

      case expression.includes("x") || !Number.isNaN(expression.replace("x", "")): {
        console.log("function that is constant or has x found");
        this.get2DPoints(expression);
        break;
      }

      default: {
        console.log("An error occurred. This function is invalid.");
        console.log("The equation inputted: " + this.equation);
        console.log("The expression found: " + expression);
        break;
      }
    }
  }
  
  get2DPoints(expression: string): void {
    this.badEquation = false;
    this.pointsToGraph = [];

    if (expression.trim() === "") {
      this.badEquation = true;
      return;
    }
    
    this.graphService.getPoints(expression).subscribe(points => { // Points is an array of all points from the DB with the current equation.
      // TODO: This gives us an array of points, but usually not the entire graph and makes the graph later on out of order.
      // We then need to sort the array later on. Consider making a new array of points and in the if statement in getXSteps
      // the while loop, insert the found point into pointsToGraph.
      // This could be done by 1) making a new array that takes the below filter, 2) sort that array and past to getXSteps,
      // 3) keep track of point(probably by incrementing some number each time the if is true) in the array and
      // push that new point into the pointsToGraph array. The incrementing method is to avoid constantly calling
      // .find on the new array, which would be become extremely slow after retrieving many, many points.
      this.pointsToGraph = points.filter(point => 
        new BigNumber(point.xcoord).isGreaterThanOrEqualTo(this.xWindowLowerString) && 
        new BigNumber(point.xcoord).isLessThanOrEqualTo(this.xWindowUpperString) // filters for points in window range
        && (new BigNumber(point.xcoord).minus(this.xWindowLowerString))
        .mod(this.xStepDelta).isEqualTo(new BigNumber(0)) // filters points that are in the set of stepped points.
      );

      console.log(`Retrieved ${this.pointsToGraph.length} point(s) from the DB.`);

      this.getXSteps(new BigNumber(this.xWindowLowerString), new BigNumber(this.xWindowUpperString),
        new BigNumber(this.xStepsString), this.pointsToGraph, expression);

      // Found coords from DB are usually out of order, so can't be graphed. This orders to fix.
      this.pointsToGraph.sort(function(pointA, pointB)  {
        return new BigNumber(pointA.xcoord).minus(new BigNumber(pointB.xcoord)).s!
        // .s gives the sign of the difference between the two points, so it'll give 1 or -1 as a number,
        // which is returned in order to sort the array.
      });

      this.getGraph();
    });
  }

  // This merges saved points with new points into pointsToGraph and calculates new points along x-step set then sends those to the DB to be saved.
  getXSteps(beginXVal: BigNumber, endXVal: BigNumber, xSteps: BigNumber, knownPoints: Point[], expression: string): void {
    let newPoints: Point[] = [];
    let currXVal: BigNumber = beginXVal;

    console.log("Number of steps for this graph: " + xSteps.valueOf());
    console.log("Value of xStepDelta, the amount of distance crossed by each step: " + this.xStepDelta.valueOf());

    while (currXVal.isLessThanOrEqualTo(endXVal)) {
      if (knownPoints.some(point => point.xcoord === currXVal.toString())) { // We check if a point already exists here and skip the calculation if it does.
        currXVal = currXVal.plus(this.xStepDelta);
        continue;
      }

      let newPoint: Point = {id: undefined!, equation: expression, xcoord: currXVal.toString(),
      ycoord: this.math.evaluate(expression, {x: currXVal.valueOf()}).toString(), zcoord: null}
      
      this.pointsToGraph.push(newPoint); // adds new point to the array
      newPoints.push(newPoint);

      currXVal = currXVal.plus(this.xStepDelta);
    }

    this.graphService.createPoints(newPoints).subscribe(() => { // Updates db with newly found points.
      console.log("Newly calculated points: " + newPoints.length);
    });
  }

  // Not yet done.
  get3DPoints(expression: string): void {
  //  this.badEquation = false;
  //  this.pointsToGraph = [];
  //  let newPoints: Point[] = [];
  //  let xWindowLower: BigNumber = new BigNumber(this.xWindowLowerString);
  //  let xWindowUpper: BigNumber = new BigNumber(this.xWindowUpperString);
  //  let yWindowLower: BigNumber = new BigNumber(this.yWindowLowerString);
  //  let yWindowUpper: BigNumber = new BigNumber(this.yWindowUpperString);
  //  let xSteps: BigNumber = new BigNumber(this.xStepsString);
  //  let ySteps: BigNumber = new BigNumber(this.yStepsString);
  //  let currXVal: BigNumber = xWindowLower;
  //  let currYVal: BigNumber = yWindowLower;
  //  let xStepDelta: BigNumber = new BigNumber(xWindowUpper.minus(xWindowLower).dividedBy(xSteps)); // to know how far to travel on x-axis before calculating new point
  //
  //  console.log("Number of steps for this graph: " + xSteps.valueOf());
  //  console.log("Value of xStepDelta, the amount of distance crossed by each step: " + xStepDelta.valueOf());
  //
  //  if (expression.trim() === "") {
  //    this.badEquation = true;
  //    return;
  //  }
  //  
  //  this.graphService.getPoints(expression).subscribe(points => { // Points is an array of all points from the DB with the current equation.
  //    // filter points array here for points matching xcoord and ycoord params
  //
  //    console.log(`Retrieved ${this.pointsToGraph.length} point(s) from the DB.`);
  //
  //    // getXSteps here, everytime they complete one 2d curve, increment currYVal by yStepDelta and do again until done
  //
  //    this.graphService.createPoints(newPoints).subscribe(() => { // Updates db with newly found points.
  //      console.log("Newly calculated points: " + newPoints.length);
  //
  //      // sort function by xcoord then ycoord here
  //
  //      this.getGraph();
  //      });
  //  } );
  }
  
  // TODO: This only is for 2d graphs. Consider making something that handles for cases involving 2 variables.
  getGraph(): void {
    if (this.myChart instanceof Chart){ // We need to destroy the graph before we can display another.
      this.myChart.destroy();
    }

    // Line Chart
    const lineCanvasEle: any = document.getElementById('myChart');
    this.myChart = new Chart(lineCanvasEle.getContext('2d'), {
      type: 'line',
        data: {
          labels: this.pointsToGraph.map(point => point.xcoord),
          datasets: [
            { data: this.pointsToGraph.map(point => point.ycoord), label: 'Value', borderColor: 'rgba(0, 0, 0)' }
          ],
        },
        options: {
          responsive: true,
          scales: {
            // the x window here is likely not needed as ChartJS can decide the windowing automatically based on the data
            x: {
              min: this.xWindowLowerString,
              max: this.xWindowUpperString
            },
            // If yWindow adjustment is ever needed, below is what will be used.
            //y: {
            //  min: this.yWindowLowerString,
            //  max: this.yWindowUpperString
            //}
          }
        }
    });
  }

  useTestValues(): void { // This is simply to avoid having to enter all parameters every time.
  this.xWindowUpperString = "10";
  this.xWindowLowerString = "-10";
  this.yWindowUpperString = "10";
  this.yWindowLowerString = "-10";
  this.xStepsString = "100";
  this.yStepsString = "100";

  this.getGraphType();
  }

  ngOnInit(): void {
  }
}

// Later TODO: It'd be cool to add to the DB after the user calculated a certain amount of new points
// This would be for really computationally heavy tasks and so the user could terminate the program,
// but all points but for a handful toward the end would still be found in the DB.
// This allows for users to not have to finish the task all at once and keep 'chipping away' at a graph
// until it is finished.
// This would look like below
// if (newPoints.length() >= 1000) then createPoints(newPoints) then newPoints = []
// This isn't complicated to do, but should be saved for when the program is functional so it doesn't interfere with testing.