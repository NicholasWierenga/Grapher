import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';
import { Point } from '../point';
import { create, all } from 'mathjs';
import * as PlotlyJS from 'plotly.js-dist';

@Component({
  selector: 'app-grapher',
  templateUrl: './grapher.component.html',
  styleUrls: ['./grapher.component.css']
})

export class GrapherComponent implements OnInit {
  // TODO: Much of this should be passed directly to getGraphType later on.
  equation: string = "-2.1x";
  xWindowLowerString: string = "";
  xWindowUpperString: string = "";
  yWindowLowerString: string = "";
  yWindowUpperString: string = "";
  xStepsString: string = "";
  yStepsString: string = "";
  xStepDelta!: math.BigNumber;
  yStepDelta!: math.BigNumber;
  pointsToGraph: Point[] = [];
  math = create(all, {number: 'BigNumber'});
  
  constructor(private graphService: GraphService) {
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
      console.log(expressionAndVariables);
      expression = expressionAndVariables[0];
      variables = expressionAndVariables[1];
    }

    // TODO: Move this to somewhere it belongs. It feels out of place.
    this.xStepDelta = this.math.bignumber(this.xWindowUpperString).minus(this.xWindowLowerString).dividedBy(this.xStepsString);
    this.yStepDelta = this.math.bignumber(this.yWindowUpperString).minus(this.yWindowLowerString).dividedBy(this.xStepsString);

    switch (true) {
      // TODO: We shouldn't save points to the DB for functions that are constant-valued.
      // These are very simple, so they don't need to take up DB space.
      // This should have a separate method called here that passes data off to the chart without calling DB.
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
    let variables: string = expression.replace(/[0-9+\-*.(){}\[\]\/<>^]/g, " ");
    
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

  // Swaps variables in the expression out for x and y, so expression like c+d, g+h, x+j, all turn into and save and retrieve
  // points using the same expression x+y. This is to avoid equations that are functionally the same from needing to
  // calculate known points again.
  fixExpressionVariables(expression: string, variables: string): string[] {
    let varSet: Set<string> = new Set(variables.split(""));
    let index: number = 0;
    varSet.delete(" ");

    varSet.forEach(char => { // Iterates through each variable used, replacing the non-x/y with x and y.
      if (char === "x" || (char === "y" && varSet.size !== 1)) {
        return; // This is JS's way of doing continue in a for loop.
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
    this.pointsToGraph = [];
    
    this.graphService.getPoints("y = " + expression).subscribe(points => {
      this.pointsToGraph = this.filterPoints(points, expression);
      console.log(`Retrieved ${this.pointsToGraph.length} point(s) from the DB.`);

      // The below if statement will be removed later. It's currently a fix for the issue of .some() being called
      // too many times and causing graphs to appear slower than if they were calculated from scratch.
      if (this.pointsToGraph.length < parseInt(this.xStepsString) + 1) {
        let calculatedPoints: Point[] = this.getNewPoints(this.pointsToGraph, expression);

        this.pointsToGraph = this.pointsToGraph.concat(calculatedPoints);
      }

      this.getGraph();
    });
  }

  // Not yet done.
  get3DPoints(expression: string): void {
    this.pointsToGraph = [];
    
    this.graphService.getPoints("z = " + expression).subscribe(points => {
      this.pointsToGraph = this.filterPoints(points, expression);
      console.log(`Retrieved ${this.pointsToGraph.length} point(s) from the DB.`);
      
      if (this.pointsToGraph.length < (parseInt(this.xStepsString) + 1) * (parseInt(this.yStepsString) + 1)) {
        let calculatedPoints: Point[] = this.getNewPoints(this.pointsToGraph, expression);
        
        this.pointsToGraph = this.pointsToGraph.concat(calculatedPoints);
      }

      this.getGraph();
    });
  }

  // This filters out points depending on the user's amount of steps and windows for x and y.
  filterPoints(points: Point[], expression: string): Point[] {
    if (expression.includes("z")) { // filters points for 3d graphs
      return points.filter(point => 
        this.math.bignumber(point.xcoord).greaterThanOrEqualTo(this.math.bignumber(this.xWindowLowerString)) &&  // filters for x window
        this.math.bignumber(point.xcoord).lessThanOrEqualTo(this.math.bignumber(this.xWindowUpperString))
        && (this.math.bignumber(point.xcoord).minus(this.math.bignumber(this.xWindowLowerString)))
        .mod(this.math.bignumber(this.xStepDelta)).equals(this.math.bignumber("0")) && // filters for xcoords that are along the step values
        this.math.bignumber(point.ycoord).greaterThanOrEqualTo(this.math.bignumber(this.yWindowLowerString)) && // same as above, but for y
        this.math.bignumber(point.ycoord).lessThanOrEqualTo(this.math.bignumber(this.yWindowUpperString)) 
        && (this.math.bignumber(point.ycoord).minus(this.math.bignumber(this.yWindowLowerString)))
        .mod(this.math.bignumber(this.yStepDelta)).equals(this.math.bignumber("0")) 
      );
    }
    else { // filters for 2d
      return points.filter(point => 
        this.math.bignumber(point.xcoord).greaterThanOrEqualTo(this.math.bignumber(this.xWindowLowerString)) && 
        this.math.bignumber(point.xcoord).lessThanOrEqualTo(this.math.bignumber(this.xWindowUpperString))
        && (this.math.bignumber(point.xcoord).minus(this.math.bignumber(this.xWindowLowerString)))
        .mod(this.math.bignumber(this.xStepDelta)).equals(this.math.bignumber("0"))
      );
    }
    
  }

  // This merges saved points with new points into pointsToGraph and calculates new points along x-step set then sends those to the DB to be saved.
  getNewPoints(knownPoints: Point[], expression: string): Point[] {
    let newPoints: Point[] = [];
    let currXVal: math.BigNumber = this.math.bignumber(this.xWindowLowerString);
    let currYVal: math.BigNumber = this.math.bignumber(this.yWindowLowerString);
    let is3D: boolean = expression.includes("y");

    console.log(`Number of x steps for this graph: ${this.xStepsString}.`);
    console.log(`Number of y steps for this graph: ${this.yStepsString}.`);
    console.log(`Value of xStepDelta, the amount of distance crossed by each step: ${this.xStepDelta.toString()}`);
    console.log(`Value of yStepDelta, the amount of distance crossed by each step: ${this.yStepDelta.toString()}`);

    // TODO: The .some() causes noticeable slowdowns when graphing 3d functions. Do something like create an object with all needed
    // coords, remove everything from the knownPoints in that new array, then iterate through the new array to avoid the .some()
    // being called thousands of times.
    while (currXVal.lessThanOrEqualTo(this.math.bignumber(this.xWindowUpperString))) {
      if (is3D) {
        while (currYVal.lessThanOrEqualTo(this.math.bignumber(this.yWindowUpperString))) {
          if (knownPoints.some(point => point.xcoord === currXVal.toString() && point.ycoord === currYVal.toString())) {
            currYVal = currYVal.plus(this.yStepDelta);
            continue;
          }

          let newPoint: Point = {id: undefined!, equation: "z = " + expression, xcoord: currXVal.toString(),
            ycoord: currYVal.toString(), zcoord: this.math.evaluate(expression,
            {x: this.math.bignumber(currXVal), y: this.math.bignumber(currYVal)}).toString()};

          newPoints.push(newPoint);
      
          currYVal = currYVal.plus(this.yStepDelta);
        }

        currYVal = this.math.bignumber(this.yWindowLowerString);
      }
      else {
        if (knownPoints.some(point => point.xcoord === currXVal.toString())) { // We check if a point already exists here and skip the calculation if it does.
          currXVal = currXVal.plus(this.xStepDelta);
          continue;
        }

        let newPoint: Point = {id: undefined!, equation: "y = " + expression, xcoord: currXVal.toString(),
          ycoord: this.math.evaluate(expression, {x: this.math.bignumber(currXVal)}).toString(), zcoord: null};
      
        newPoints.push(newPoint);
      }
      
      currXVal = currXVal.plus(this.xStepDelta);
    }

    this.graphService.createPoints(newPoints).subscribe(() => { // Updates db with newly found points.
      console.log("Newly calculated points: " + newPoints.length);
    });
    
    return newPoints;
  }
  
  getGraph(): void {
    console.log("Total points: " + this.pointsToGraph.length);

    if (this.pointsToGraph[0].equation.includes("z")) {
      let splitPoints: Point[][] = [];
      let skipAmount: number = parseInt(this.xStepsString) + 1;

      this.pointsToGraph.sort((pointA, pointB) => {
        return this.math.number(this.math.sign(this.math.bignumber(pointA.xcoord).minus(this.math.bignumber(pointB.xcoord)))
        );
      });

      // TODO: This copying is a temporary fix for a previous todo. Change around some logic so we aren't populating
      // splitPoints through removing elements from pointsToGraph. This fix was just to call this.pointsToGraph[0].equation
      // in layout below.
      let copyOfPoints: Point[] = [];
      Object.assign(copyOfPoints, this.pointsToGraph);

      // Because we sorted pointsToGraph by xcoord, we can split it apart into a number of arrays, each with the same xcoord
      while (splitPoints.length < parseInt(this.yStepsString) + 1) {
        splitPoints.push(copyOfPoints.splice(0, skipAmount));
      }

      // PlotlyJS likes to have 3d graph data that is split up into a number of arrays, each one signifying a line.
      // For here, since we sorted by xcoord above, splitPoints[0] would correspond to the line of x,y,z coords where x=xWindowLowerString.
      // Without splitting the array, PlotlyJS assumes everything is contained on one great big line and starts connecting points and forming
      // surfaces together, often causing false surfaces in the output.
      var traces: PlotlyJS.Data = {
        x: splitPoints.map(pointArray => pointArray.map(point => point.xcoord)),
        y: splitPoints.map(pointArray => pointArray.map(point => point.ycoord)),
        z: splitPoints.map(pointArray => pointArray.map(point => point.zcoord)),
        type: "surface"
      };
    }
    else {

      var traces: PlotlyJS.Data = {
        x: this.pointsToGraph.map(point => point.xcoord),
        y: this.pointsToGraph.map(point => point.ycoord),
        type: 'scatter'
      };
    }

    let layout = {
      title: `${this.pointsToGraph[0].equation}`
    };

    let data: PlotlyJS.Data[] = [traces];

    const myPlot: HTMLElement = document.getElementById('plotlyChart')!;
    PlotlyJS.newPlot(myPlot, data, layout);
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

// TODO: It'd be cool to add to the DB after the user calculated a certain amount of new points
// This would be for really computationally heavy tasks and so the user could terminate the program,
// but all points but for a handful toward the end would still be found in the DB.
// This allows for users to not have to finish the task all at once and keep 'chipping away' at a graph
// until it is finished.
// This would look like below
// if (newPoints.length() >= 1000) then createPoints(newPoints) then newPoints = []
// This isn't complicated to do, but should be saved for when the program is functional so it doesn't interfere with testing.

// TODO: A function like sin(x)+cos(x*(sin(x))) will work, but the functions sin(x)+cos(x(sin(x))) and sin(x)+cos(xsin(x)).
// but I would like those to work also. MathJS can do .simplify() to get rid of redundant ()'s, but it would be nice to add something
// into the program that identifies that xsin(x) means x*sin(x). This would probably look something like identifying that x is next
// to a non-variable letter, which indicates it's meant to act as a multiple of some function. This could be done by instead of
// searching through and spacing-out found trig functions, we give some other value like # and so we check if # is adjacent
// x. If so, we simply put a * between them and then the program won't error out and cause the user to have to put the * themself.

// TODO: Implement some logic that replaces the need for the user to define how many steps to take. This would look like finding the
// derivative of the inputted function and comparing the value of the derivative at the previous point and the current point. If
// the difference between the too is too large, pick the point between the two and try again until the values are close enough. 

// TODO: The equation that is listed above the graph for something like 1/3x displays as 0.3333333333333333333333x, which is obnoxious.