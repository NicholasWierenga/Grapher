import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';
import { Point } from '../point';
import { create, all } from 'mathjs';
import * as PlotlyJS from 'plotly.js-dist-min';

@Component({
  selector: 'app-grapher',
  templateUrl: './grapher.component.html',
  styleUrls: ['./grapher.component.css']
})

// TODO: Fix bug where very large numbers 111111111111111 are turned into 111111111111111x.
export class GrapherComponent implements OnInit {
  // TODO: Much of this should be passed directly to getGraphType later on.
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
  graphData: PlotlyJS.Data[] = [];
  graphType: string = "";
  newPointsFoundCount: number = 0;
  savedPointsFoundCount: number = 0;
  totalPointsFoundCount: number = 0;
  math = create(all, {number: 'BigNumber'});
  
  constructor(private graphService: GraphService) {
  }

  // TODO: Changing windows for 3D graphs can cause visual errors. This is likely from unsorted data.
  // Currently, the logic for recalculating for 3D graphs is commented out.
  // Recalculates previously used equations at the new window settings and steps.
  redoPreviousTraces(): void {
    this.newPointsFoundCount = 0;
    this.savedPointsFoundCount = 0;
    let userXStepsString: string = this.xStepsString;
    let userYStepsString: string = this.yStepsString;
    let userEquation: string = this.equation;
    let amountOfRedos: number = 0;

    this.getGraphType();
    
    if (this.graphData.length >= 1) {
      this.graphData.forEach(data => {
        this.equation = data.name!;
        // TODO: Sort the below x's and y's. Currently we're just hoping that the lowest and highest.
        // This is probably best to do elsewhere, like in getNewPoints().
        // are the beginning and end of the array.
        let oldLowerXString: string = data.x![0]!.toString();
        let oldUpperXString: string = data.x![data.x!.length - 1]!.toString();
        let oldLowerYString: string = data.y![0]!.toString();
        let oldUpperYString: string = data.y![data.y!.length - 1]!.toString();
  
        // TODO: An issue occurs for 2D graphs. putting in 1, x, then x^2 and then switching x to be from -15, 15,
        // the graph won't update for y = 1. Clicking it again will fix everything.
        // We delete and redo any traces found to have different window settings.
        if ((oldLowerXString !== this.xWindowLowerString || oldUpperXString !== this.xWindowUpperString)
          && data.name!.includes("y")) {
          this.equation = data.name!
          console.log("Old 2D trace found with bad windows. It is: " + data.name);
  
          this.getGraphType();
  
          amountOfRedos++;
        }
        // This is not done due to sorting points problems.
        //else if ((oldLowerXString !== this.xWindowLowerString || oldUpperXString !== this.xWindowUpperString
        //  || oldLowerYString !== this.yWindowLowerString || oldUpperYString !== this.yWindowUpperString)
        //  && data.name!.includes("z")) {
        //  this.equation = data.name!
        //  console.log("Old 3D trace found with bad windows. It is: " + data.name);
        //
        //  this.getGraphType();
        //
        //  amountOfRedos++;
        //}
      })
    }

    console.log("Amount of redone equations: " + amountOfRedos);

    // After the redos are finished, we set the user's input back to normal on the front-end.
    this.xStepsString = userXStepsString; 
    this.yStepsString = userYStepsString;
    this.equation = userEquation;
  }

  getGraphType(): void {
    // TODO: Start moving some of this stuff out of here. It feels weird to have this long of a method for something
    // simple like getting graphType.
    this.pointsToGraph = []; // maybe set length to 0 instead to fix the always adding 1 new point problem?
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
    
    this.xStepDelta = this.math.bignumber(this.xWindowUpperString).minus(this.xWindowLowerString).dividedBy(this.xStepsString);
    
    switch (onlyVariables.length) {
      case 0: {
        // This is for constant-valued functions. Because they're so simple, there's little sense is storing them to the DB.
        // This case could be deleted and these functions will be treated like all other 2D functions, but it's likely that
        // storing and then sifting through the DB for points would result in a slow graph than just calculating it.
        console.log("Constant function found.");
        this.graphType = "constant";
        expression = `y = ${expression}`;
        this.pointsToGraph = this.getNewPoints(this.pointsToGraph, expression);

        this.verifyInput(expression, onlyVariables);

        this.getGraph();

        return;
      }
      case 1: {
        console.log("Single variable function found.");
        this.graphType = "2D";
        expression = `y = ${expression}`;
        break;
      }
      case 2: {
        console.log("Two variable function found.");
        this.graphType = "3D";
        this.yStepDelta = this.math.bignumber(this.yWindowUpperString).minus(this.yWindowLowerString).dividedBy(this.yStepsString);
        expression = `z = ${expression}`;
        break;
      }
      default: {
        console.log("An error has occurred.");
        console.log(`Bad expression: ${expression}.`);
        console.log(`User input was: ${this.equation}.`);
      }
    }

    this.verifyInput(expression, onlyVariables);
    
    this.getAllPoints(expression);
  }

  verifyInput(equation: string, onlyVariables: string): void {
    // Checks if user's equation requires a dimension change for the graph. If so, graph is deleted.
    this.graphData.every(data => {
      if ([...onlyVariables].length <= 1 && data.name!.includes("z")
      || [...onlyVariables].length === 2 && !data.name!.includes("z")) {
        console.log("Dimension mismatch found. Resetting graph.");
        
        this.purgeGraph();

        return false; // return false; in .every() is equivalent to break;
      }
    });

    // Deletes current data for an equation if it has already be graphed.
    let indexOfEquation: number = this.graphData.findIndex(data => data.name === equation);
    if (indexOfEquation !== -1) {
      PlotlyJS.deleteTraces("plotlyChart", indexOfEquation);
      this.graphData.splice(indexOfEquation, 1);
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

        if (expression[index] === [...varSet][0]) { // [...varSet] turns the set into an array
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

  // Retrieves points from DB and calculates unknown points
  getAllPoints(equation: string): void {
    this.graphService.getPoints(equation).subscribe(points => {
      this.pointsToGraph = this.filterPoints(points);
      console.log(`Retrieved ${this.pointsToGraph.length} point(s) from the DB.`);

      this.savedPointsFoundCount += this.pointsToGraph.length;
      console.log("saved points count: " + this.savedPointsFoundCount);

      // The below if statement will be removed later. It's currently a fix for the issue of .some() being called
      // too many times and causing graphs to appear slower than if they were calculated from scratch.
      if (this.pointsToGraph.length < (parseInt(this.xStepsString) + 1) * (parseInt(this.yStepsString) + 1)) {
        let calculatedPoints: Point[] = this.getNewPoints(this.pointsToGraph, equation);
        
        this.pointsToGraph = this.pointsToGraph.concat(calculatedPoints);
      }

      this.getGraph();
    });
  }

  // This filters out points depending on the user's amount of steps and windows for x and y.
  filterPoints(points: Point[]): Point[] {
    if (this.graphType == "3D") {
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

  // TODO: There's a payload too large error for many, many point calls. Break up requests into a while loop.
  // This merges saved points with new points into pointsToGraph and calculates new points along x-step set then sends those to the DB to be saved.
  getNewPoints(knownPoints: Point[], equation: string): Point[] {
    let newPoints: Point[] = [];
    let currXVal: math.BigNumber = this.math.bignumber(this.xWindowLowerString);
    let currYVal: math.BigNumber = this.math.bignumber(this.yWindowLowerString);

    // TODO: The .some() causes noticeable slowdowns when graphing 3d functions. Do something like create an object with all needed
    // coords, remove everything from the knownPoints in that new array, then iterate through the new array to avoid the .some()
    // being called thousands of times.
    // Idea for the above TODO: For this, try creating an array of length however many points there should be. Then, foreach the 
    // known points and count how many deltas it is from the lower window to decide where it should be placed in the new blanked array.
    // Next, foreach through the new array with some points in it from the DB, and for every element of that array that is
    // undefined, set it to the point that it should belong to according to its index.
    // This would have the added benefit of sorting our data and removing the need for .some()ing thousands upon thousands
    // of times for an array that is already thousands large.
    while (currXVal.lessThanOrEqualTo(this.math.bignumber(this.xWindowUpperString))) {
      if (this.graphType === "3D") {
        while (currYVal.lessThanOrEqualTo(this.math.bignumber(this.yWindowUpperString))) {
          if (knownPoints.some(point => point.xcoord === currXVal.toString() && point.ycoord === currYVal.toString())) {
            currYVal = currYVal.plus(this.yStepDelta);
            continue;
          }

          let newPoint: Point = {id: undefined!, equation: equation, xcoord: currXVal.toString(),
            ycoord: currYVal.toString(), zcoord: this.math.evaluate(equation,
            {x: this.math.bignumber(currXVal), y: this.math.bignumber(currYVal)}).toString()};

          newPoints.push(newPoint);
      
          currYVal = currYVal.plus(this.yStepDelta);
        }

        currYVal = this.math.bignumber(this.yWindowLowerString);
      }

      if (this.graphType === "2D" || this.graphType === "constant") {
        // We check if a point already exists here and skip the calculation if it does.
        if (knownPoints.some(point => point.xcoord === currXVal.toString())) {
          currXVal = currXVal.plus(this.xStepDelta);
          continue;
        }

        let newPoint: Point = {id: undefined!, equation: equation, xcoord: currXVal.toString(),
          ycoord: this.math.evaluate(equation, {x: this.math.bignumber(currXVal)}).toString(), zcoord: null};
      
        newPoints.push(newPoint);
      }
      
      currXVal = currXVal.plus(this.xStepDelta);
    }

    this.newPointsFoundCount += newPoints.length;
    console.log("points found count: " + newPoints.length);

    // We don't want to save constant functions to the DB. They are simple enough to calculate every time.
    if (this.graphType !== "constant") {
      this.graphService.createPoints(newPoints).subscribe(() => {
        console.log("Newly calculated points: " + newPoints.length);
      });
    }

    return newPoints;
  }

  // TODO: There's an issue when requesting too many points from the program. It's an ArrayBuffer error and probably caused by PlotlyJS.
  getGraph(): void {
    let layout: Partial<PlotlyJS.Layout> = {
      xaxis: {range: [this.math.bignumber(this.xWindowLowerString).toString(), this.math.bignumber(this.xWindowUpperString).toString()]}
    };
    
    if (this.yWindowLowerString !== "" && this.yWindowUpperString !== "") {
      layout.yaxis = {range: [this.math.bignumber(this.yWindowLowerString).toString(), this.math.bignumber(this.yWindowUpperString).toString()]};
    }

    let config: Partial<PlotlyJS.Config> = {
      //responsive: true
    }

    console.log(`Total points for ${this.pointsToGraph[0].equation}: ${this.pointsToGraph.length}.`);

    if (this.graphType === "3D") {
      let splitPoints: Point[][] = [];
      let skipAmount: number = parseInt(this.xStepsString) + 1;

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
      var trace: PlotlyJS.Data = {
        x: splitPoints.map(pointArray => pointArray.map(point => point.xcoord)),
        y: splitPoints.map(pointArray => pointArray.map(point => point.ycoord)),
        z: splitPoints.map(pointArray => pointArray.map(point => point.zcoord)),
        name: this.pointsToGraph[0].equation,
        type: "surface",
        hovertemplate: `(%{x},%{y},%{z})` // %{x} is what tells PlotlyJS to display the xcoord for what point cursor is on.
      };
    }
    else {
      var trace: PlotlyJS.Data = {
        x: this.pointsToGraph.map(point => point.xcoord),
        y: this.pointsToGraph.map(point => point.ycoord),
        name: this.pointsToGraph[0].equation,
        type: "scatter",
        hovertemplate: `(%{x},%{y})`
      };
    }

    this.graphData.push(trace);

    this.totalPointsFoundCount = this.newPointsFoundCount + this.savedPointsFoundCount;
    console.log("New: " + this.newPointsFoundCount);
    console.log("Saved: " + this.savedPointsFoundCount);
    console.log("Total: " + this.totalPointsFoundCount);

    if (this.graphData.length === 1) {
      layout.showlegend = true; // PlotlyJS does not support legend showing legend for surface plots.
      PlotlyJS.newPlot("plotlyChart", [trace], layout, config);
    }
    else {
      PlotlyJS.addTraces("plotlyChart", [trace]);
      PlotlyJS.relayout("plotlyChart", layout);
    }
  }

  useTestValues(): void { // This is simply to avoid having to enter all parameters every time.
  this.xWindowUpperString = "10";
  this.xWindowLowerString = "-10";
  this.yWindowUpperString = "10";
  this.yWindowLowerString = "-10";
  this.xStepsString = "100";
  this.yStepsString = "100";

  this.redoPreviousTraces();
  }

  purgeGraph(): void {
    this.graphData = [];
    PlotlyJS.purge("plotlyChart");
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

// TODO: A function like sin(x)+cos(x*(sin(x))) will work, but the functions sin(x)+cos(x(sin(x))) and sin(x)+cos(xsin(x)) won't
// and I would like those to work also. MathJS can do .simplify() to get rid of redundant ()'s, but it would be nice to add something
// into the program that identifies that xsin(x) means x*sin(x). This would probably look something like identifying that x is next
// to a non-variable letter, which indicates it's meant to act as a multiple of some function. This could be done by instead of
// searching through and spacing-out found trig functions, we give some other value like # and so we check if # is adjacent
// x. If so, we simply put a * between them and then the program won't error out and cause the user to have to put the * themself.

// TODO: Implement some logic that replaces the need for the user to define how many steps to take. This would look like finding the
// derivative of the inputted function and comparing the value of the derivative at the previous point and the current point. If
// the difference between the too is too large, pick the point between the two and try again until the values are close enough. 

// TODO: The equation that is listed above the graph for something like 1/3x displays as 0.3333333333333333333333x, which is obnoxious.

// Maybe TODO: MathJS does not simplify expressions like tan(x)*cos(x) correctly. tan(x) = sin(x)/cos(x), so we should be able to
// substitute that in for tan(x), then .simplify() with MathJS to cancel out the cos(x). This would also give the added benefit by
// further simplifying down equations sent to the DB and cutting down the calculations, which would overall speed up the program
// for someone using equations like tan(x)*cos(x). It would allow them to pull from the DB using sin(x), which is more likely to be
// present than something like tan(x)*cos(x).
