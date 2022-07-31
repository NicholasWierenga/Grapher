import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';
import { Point } from '../point';
import { Chart, registerables } from 'chart.js';
import { create, all } from 'mathjs';

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
  xStepDelta!: math.BigNumber;
  yStepDelta!: math.BigNumber;
  pointsToGraph: Point[] = [];
  badEquation: boolean = false;
  math = create(all, {number: 'BigNumber'}); // since this is configured to use BigNumber, we might not need to do bignumber conversions
  myChart!: Chart<"line", string[], string>; 
  
  constructor(private graphService: GraphService) { 
    Chart.register(...registerables);
  }

  getGraphType(): void {
    // gives the simplified expression right of = to ensure things like y = x + 2, y = -1 + x + 3, are both turned into x + 2.
    // mathjs allows for y=5x to be a valid input to graph, but we only want the expression, which is why we use .split("=").
    let expression: string = this.math.simplify(this.equation.split("=")[this.equation.split("=").length - 1]).toString();
    let variables: string = this.getVariables(expression);
    let onlyVariables: string = variables.replace(/\s+/g, "");
    
    if ((onlyVariables !== "x" && onlyVariables.length === 1) || !(onlyVariables.includes("x") && onlyVariables.includes("y"))
    || onlyVariables.length === 0) { // checks if expression has valid variables
      let expressionAndVariables: string[] = this.fixExpressionVariables(expression, variables);
      expression = expressionAndVariables[0];
      variables = expressionAndVariables[1];
    }

    // TODO: Move this to somewhere it belongs. It feels out of place.
    this.xStepDelta = this.math.bignumber(this.xWindowUpperString).minus(this.xWindowLowerString).dividedBy(this.xStepsString);

    switch (true) {
      // TODO: We shouldn't save points to the DB for functions that are constant-valued.
      // These are very simple, so they don't need to take up DB space.
      // This should have a seperate method called here that passes data off to the chart without calling DB.
      case !variables.includes("x") && !variables.includes("y"): {
        // TODO: for this, change pointsToGraph to addrange a bunch of constant values, then go straight to graph2D.
        console.log("function of a constant was found");
        this.get2DPoints(expression);
        break;
      }

      case variables.includes("x") && !variables.includes("y"): {
        console.log("function of 1 variable was found");
        this.get2DPoints(expression);
        break;
      }

      case variables.includes("x") && variables.includes("y"): {
        console.log("function of 2 variables was found");
        this.get3DPoints(expression);
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

  // This takes in our expression and returns what variables the user entered.
  getVariables(expression: string): string {
    let variables: string = expression.replace(/[0-9+\-*.(){}\[\]<>^]/g, " ");
    
    let toRemove: string[] = ["sinh", "cosh", "sech", "csch", "tanh", "coth",
    "sin", "cos", "sec", "csc", "tan", "cot"];

    toRemove.forEach(removedString => {
      while (variables.includes(removedString)) {
        variables = variables.replace(removedString, "".padEnd(removedString.length, " "));
      }
    });

    // variables is typically returned with copies of each variable used and spaces between them
    // this is meant to be the case, because it retains position of each variable, which is used to fix the variables later on
    return variables;
  }

  // Swaps variables in the expression out for x and y, so expression like c+d, g+h, x+j, all turn into and save and retreive
  // points using the same expression x+y. This is to avoid equations that are functionally the same from needing to
  // calculate known points again.
  fixExpressionVariables(expression: string, variables: string): string[] {
    let varSet: Set<string> = new Set(variables.split(""));
    let index: number = 0;
    varSet.delete(" ");

    varSet.forEach(char => { // iterates through each variable used, replacing the non-x/y with x and y.
      if (char === "x" || (char === "y" && varSet.size !== 1)) {
        return; // JS likes to call things that should be continue for loops return for whatever reason.
      }
      
      while (variables.includes(char)) {
        index = variables.indexOf(char);

        if (expression[index] === [...varSet][0]) {
          expression = expression.substring(0, index) + "x" + expression.substring(index + 1, expression.length);
          variables = variables.substring(0, index) + "x" + variables.substring(index + 1, variables.length);
        }

        if (expression[index] === [...varSet][1]) {
          expression = expression.substring(0, index) + "y" + expression.substring(index + 1, expression.length);
          variables = variables.substring(0, index) + "y" + variables.substring(index + 1, variables.length);
        }
      }
    });

    return [this.math.simplify(expression).toString(), variables];
  }
  
  get2DPoints(expression: string): void {
    this.badEquation = false;
    this.pointsToGraph = [];
    console.log(expression);

    if (expression.trim() === "") {
      this.badEquation = true;
      return;
    }
    
    this.graphService.getPoints("y = " + expression).subscribe(points => { // Points is an array of all points from the DB with the current equation.
      // TODO: This gives us an array of points, but usually not the entire graph and makes the graph later on out of order.
      // We then need to sort the array later on. Consider making a new array of points and in the if statement in getXSteps
      // the while loop, insert the found point into pointsToGraph.
      // This could be done by 1) making a new array that takes the below filter, 2) sort that array and past to getXSteps,
      // 3) keep track of point(probably by incrementing some number each time the if is true) in the array and
      // push that new point into the pointsToGraph array. The incrementing method is to avoid constantly calling
      // .find on the new array, which would be become extremely slow after retrieving many, many points.
      this.pointsToGraph = points.filter(point => 
        this.math.bignumber(point.xcoord).greaterThanOrEqualTo(this.xWindowLowerString) && 
        this.math.bignumber(point.xcoord).lessThanOrEqualTo(this.xWindowUpperString) // filters for points in window range
        && (this.math.bignumber(point.xcoord).minus(this.xWindowLowerString))
        .mod(this.xStepDelta).equals("0") // filters points that are in the set of stepped points.
      );

      console.log(`Retrieved ${this.pointsToGraph.length} point(s) from the DB.`);

      this.getXSteps(this.math.bignumber(this.xWindowLowerString), this.math.bignumber(this.xWindowUpperString),
      this.math.bignumber(this.xStepsString), this.pointsToGraph, "y = " + expression);

      // Found coords from DB are usually out of order, so can't be graphed. This orders to fix.
      this.pointsToGraph.sort((pointA, pointB) => {
        return this.math.number(this.math.sign(this.math.bignumber(pointA.xcoord).minus(this.math.bignumber(pointB.xcoord))));
      });

      this.getGraph();
    });
  }

  // This merges saved points with new points into pointsToGraph and calculates new points along x-step set then sends those to the DB to be saved.
  getXSteps(beginXVal: math.BigNumber, endXVal: math.BigNumber, xSteps: math.BigNumber, knownPoints: Point[], equation: string): void {
    let newPoints: Point[] = [];
    let currXVal: math.BigNumber = beginXVal;

    console.log("Number of steps for this graph: " + xSteps.valueOf());
    console.log("Value of xStepDelta, the amount of distance crossed by each step: " + this.xStepDelta.valueOf());

    while (currXVal.lessThanOrEqualTo(endXVal)) {
      if (knownPoints.some(point => point.xcoord === currXVal.toString())) { // We check if a point already exists here and skip the calculation if it does.
        currXVal = currXVal.plus(this.xStepDelta);
        continue;
      }

      let newPoint: Point = {id: undefined!, equation: equation, xcoord: currXVal.toString(),
      ycoord: this.math.evaluate(equation, {x: this.math.bignumber(currXVal.valueOf())}).toString(), zcoord: null};
      
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
            // This will likely only be used for a 3D graph.
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

// This is an area for TODO's that would be nice to implement, but won't prevent the program from functioning,
// so they're not terribly important.

// Later TODO: It'd be cool to add to the DB after the user calculated a certain amount of new points
// This would be for really computationally heavy tasks and so the user could terminate the program,
// but all points but for a handful toward the end would still be found in the DB.
// This allows for users to not have to finish the task all at once and keep 'chipping away' at a graph
// until it is finished.
// This would look like below
// if (newPoints.length() >= 1000) then createPoints(newPoints) then newPoints = []
// This isn't complicated to do, but should be saved for when the program is functional so it doesn't interfere with testing.

// Later TODO: A function like sin(x)+cos(x*(sin(x))) will work, but the functions sin(x)+cos(x(sin(x))) and sin(x)+cos(xsin(x)).
// but I would like those to work also. MathJS can do .simplify() to get rid of redundant ()'s, but it would be nice to add something
// into the program that identifies that xsin(x) means x*sin(x). This would probably look something like identifying that x is next
// to a non-variable letter, which indicates it's meant to act as a multiple of some function. This could be done by instead of
// searching through and spacing-out found trig functions, we give some other value like # and so we check if # is consecutive to
// x and if so, we simply put a * between them.