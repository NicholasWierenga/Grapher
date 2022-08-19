import { Component, OnInit } from '@angular/core';
import { TestService } from '../test.service';
import { GraphService } from '../graph.service';
import { Point } from '../point';
import { create, all, BigNumber } from 'mathjs';
import * as PlotlyJS from 'plotly.js-dist-min';
import { MathExtrasService } from '../math-extras.service';

@Component({
  selector: 'app-grapher',
  templateUrl: './grapher.component.html',
  styleUrls: ['./grapher.component.css']
})

// TODO: Fix bug where very large numbers 111111111111111 are turned into 111111111111111x.
export class GrapherComponent implements OnInit {
  equation: string = "";
  xWindowLowerString!: string;
  xWindowUpperString!: string;
  yWindowLowerString!: string;
  yWindowUpperString!: string;
  xStepsString!: string;
  yStepsString!: string;
  xStepDelta!: math.BigNumber;
  yStepDelta!: math.BigNumber;
  pointsToGraph: Point[] = [];
  graphData: PlotlyJS.Data[] = [];
  graphType: string = "";
  newPointsFoundCount: number = 0;
  savedPointsFoundCount: number = 0;
  totalPointsFoundCount: number = 0;
  config: math.ConfigOptions = {
    epsilon: 1e-32,
    matrix: 'Matrix',
    number: 'BigNumber',
    precision: 64,
    predictable: false,
    randomSeed: null,
  };
  math: math.MathJsStatic = create(all, this.config);
  badEquation!: boolean 
  badXLower!: boolean
  badXUpper!: boolean
  badYLower!: boolean
  badYUpper!: boolean
  badXSteps!: boolean
  badYSteps!: boolean
  badXWindow!: boolean
  badYWindow!: boolean
  badXStepsIsLessThanZero!: boolean;
  badYStepsIsLessThanZero!: boolean;
  badXStepsIsDecimal!: boolean;
  badYStepsIsDecimal!: boolean;
  
  constructor(private graphService: GraphService, private mathExtras: MathExtrasService,
    private testService: TestService) { }

  // TODO: Windowing still needs work. It's possible to set windows to bad values and not have them display on the front-end.
  // This checks if the data the user is sending can be used. If not, error messages will be shown on the front-end.
  validateData(): void {
    let noInputIssues = true;
    this.badEquation = false;
    this.badXLower = false;
    this.badXUpper = false;
    this.badYLower = false;
    this.badYUpper = false;
    this.badXSteps = false;
    this.badYSteps = false;
    this.badXWindow = false;
    this.badYWindow = false;
    this.badXStepsIsLessThanZero = false;
    this.badYStepsIsLessThanZero = false;
    this.badXStepsIsDecimal = false;
    this.badYStepsIsDecimal = false;
    
    // TODO: There's still bad equation inputs that will error out the program.
    // Something like "qwerty" should fail, because that would result in more than 2 variables.
    // This could be solved sort of like the TODO below where we'd swap 
    if (this.equation.length === 0) {
      this.badEquation = true;
      noInputIssues = false;
    }

    this.xStepsString = this.xStepsString ?? "100";
    this.yStepsString = this.yStepsString ?? "100";
    this.xWindowLowerString = this.xWindowLowerString ?? "-10";
    this.yWindowLowerString = this.yWindowLowerString ?? "-10";
    // TODO: This sets the y-windows for 2D as well, which can cut off parts of graph.
    // The default behavior empty-valued 2D equations should be to let PlotlyJS decide y-windowing.
    // A way to do this could be to change one of the functions handling variables to something
    // that tacks on "y = " or "z = " and then return an equation instead.
    // Then we can check if what the current equation has a either of those above strings
    // to decide if we should use default y-windows or keep it empty.

    // Later in the program we convert to bignumber these, so we want to make sure users
    // aren't entering something that can't be converted.
    try {
      this.math.bignumber(this.xWindowLowerString);

      this.xWindowUpperString = this.xWindowUpperString ?? this.math.bignumber(this.xWindowLowerString).plus("20").toString();
    }
    catch {
      this.badXLower = true;
      noInputIssues = false;
    }

    try {
      this.math.bignumber(this.yWindowLowerString);

      this.yWindowUpperString = this.yWindowUpperString ?? this.math.bignumber(this.yWindowLowerString).plus("20").toString();
    }
    catch {
      this.badYLower = true;
      noInputIssues = false;
    }

    try {
      this.math.bignumber(this.xWindowUpperString);
    }
    catch {
      this.badXUpper = true;
      noInputIssues = false;
    }

    try {
      this.math.bignumber(this.yWindowUpperString);
    }
    catch {
      this.badYUpper = true;
      noInputIssues = false;
    }

    try {
      this.math.bignumber(this.xStepsString);
    }
    catch {
      this.badXSteps = true;
      noInputIssues = false;
    }

    if (!this.badXSteps) {
      if (this.mathExtras.isLessThan(this.math.bignumber(this.xStepsString), this.math.bignumber("0"))) {
        this.badXStepsIsLessThanZero = true;
        noInputIssues = false;
      }

      if (this.math.round(this.math.bignumber(this.xStepsString)).toString() !== this.math.bignumber(this.xStepsString).toString()) {
        this.badXStepsIsDecimal = true;
        noInputIssues = false;
      }
    }

    try {
      this.math.bignumber(this.yStepsString);
    }
    catch {
      this.badYSteps = true;
      noInputIssues = false;
    }

    if (!this.badYSteps) {
      if (this.mathExtras.isLessThan(this.math.bignumber(this.yStepsString), this.math.bignumber("0"))) {
        this.badYStepsIsLessThanZero = true;
        noInputIssues = false;
      }

      if (this.math.round(this.math.bignumber(this.yStepsString)).toString() !== this.math.bignumber(this.yStepsString).toString()) {
        this.badYStepsIsDecimal = true;
        noInputIssues = false;
      }
    }

    try {
      this.mathExtras.isLessThan(this.math.bignumber(this.xWindowUpperString), this.math.bignumber(this.xWindowLowerString))
    }
    catch {
      this.badXWindow = true;
      noInputIssues = false;
    }

    try {
      this.mathExtras.isLessThan(this.math.bignumber(this.yWindowUpperString), this.math.bignumber(this.yWindowLowerString))
    } 
    catch {
      this.badYWindow = true;
      noInputIssues = false;
    }

    if (noInputIssues) {
      this.redoPreviousTraces();
    }
  }

  // Recalculates previously used equations at the new window settings and steps.
  redoPreviousTraces(): void {
    this.newPointsFoundCount = 0;
    this.savedPointsFoundCount = 0;
    let userXStepsString: string = this.xStepsString;
    let userYStepsString: string = this.yStepsString;
    let userEquation: string = this.equation;
    let amountOfRedos: number = 0;

    this.getGraphType(); // Graphs current expression.
    
    if (this.graphData.length >= 1) {
      this.graphData.forEach(data => {
        if (userEquation === data.name!.split("=")[1]) {
          return; // We don't want to re-evaluate the equation the user just put in. It was done a few lines above.
        }

        this.equation = data.name!;
        let oldLowerXString: string = data.x![0]!.toString();
        let oldUpperXString: string = data.x![data.x!.length - 1]!.toString();
        let oldLowerYString: string = data.y![0]!.toString();
        let oldUpperYString: string = data.y![data.y!.length - 1]!.toString();

        // We redo any traces found to have different window settings.
        if ((oldLowerXString !== this.xWindowLowerString || oldUpperXString !== this.xWindowUpperString)
          && data.name!.includes("y")) {
          this.equation = data.name!;
          console.log("Old 2D trace found with bad windows. It is: " + data.name);
  
          this.getGraphType();
  
          amountOfRedos++;
        }
        else if ((oldLowerXString !== this.xWindowLowerString || oldUpperXString !== this.xWindowUpperString
          || oldLowerYString !== this.yWindowLowerString || oldUpperYString !== this.yWindowUpperString)
          && data.name!.includes("z")) {
          this.equation = data.name!;
          console.log("Old 3D trace found with bad windows. It is: " + data.name);
        
          this.getGraphType();
        
          amountOfRedos++;
        }
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
    let onlyVariables: Set<string> = new Set(variables.replace(/\s+/g, ""));
    
    if ((onlyVariables.has("x") && onlyVariables.size === 1) 
    || !(onlyVariables.has("x") && onlyVariables.has("y"))) { // checks if expression has valid variables
      let expressionAndVariables: string[] = this.fixExpressionVariables(expression, variables);
      expression = expressionAndVariables[0];
      variables = expressionAndVariables[1];
    }
    
    this.xStepDelta = this.math.bignumber(this.math.bignumber(this.xWindowUpperString)
    .minus(this.xWindowLowerString).dividedBy(this.xStepsString));
    
    
    switch (onlyVariables.size) {
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
        this.yStepDelta = this.math.bignumber(this.yWindowUpperString)
        .minus(this.yWindowLowerString).dividedBy(this.yStepsString);
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

  verifyInput(equation: string, onlyVariables: Set<string>): void {
    // Checks if user's equation requires a dimension change for the graph. If so, graph is deleted.
    this.graphData.every(data => {
      if (onlyVariables.size <= 1 && data.name!.includes("z")
      || onlyVariables.size === 2 && !data.name!.includes("z")) {
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

      this.pointsToGraph = this.getNewPoints(this.pointsToGraph, equation);

      this.getGraph();
    });
  }

  // This filters out points depending on the user's amount of steps and windows for x and y.
  filterPoints(points: Point[]): Point[] {
    let epsilon: BigNumber = this.math.bignumber("1e-32");

    if (this.graphType == "3D") {
      return points.filter(point =>
        this.mathExtras.isGreaterThanOrEqualTo(this.math.bignumber(point.xcoord), this.math.bignumber(this.xWindowLowerString), epsilon)
        && this.mathExtras.isLessThanOrEqualTo(this.math.bignumber(point.xcoord), this.math.bignumber(this.xWindowUpperString), epsilon)
        && (this.mathExtras.isEqual(this.math.bignumber(point.xcoord).add(this.math.bignumber(this.xWindowLowerString))
        .mod(this.xStepDelta), this.math.bignumber("0"), epsilon)
        || this.mathExtras.isEqual(this.math.bignumber(point.xcoord).add(this.math.bignumber(this.xWindowLowerString))
        .mod(this.xStepDelta), this.xStepDelta, epsilon))
        && this.mathExtras.isGreaterThanOrEqualTo(this.math.bignumber(point.ycoord), this.math.bignumber(this.yWindowLowerString), epsilon)
        && this.mathExtras.isLessThanOrEqualTo(this.math.bignumber(point.ycoord), this.math.bignumber(this.yWindowUpperString), epsilon)
        && (this.mathExtras.isEqual(this.math.bignumber(point.ycoord).add(this.math.bignumber(this.yWindowLowerString))
        .mod(this.yStepDelta), this.math.bignumber("0"), epsilon)
        || this.mathExtras.isEqual(this.math.bignumber(point.ycoord).add(this.math.bignumber(this.yWindowLowerString))
        .mod(this.yStepDelta), this.yStepDelta, epsilon))
      );
    }
    else { // filters for 2d
      return points.filter(point => 
        this.mathExtras.isGreaterThanOrEqualTo(this.math.bignumber(point.xcoord), this.math.bignumber(this.xWindowLowerString), epsilon)
        && this.mathExtras.isLessThanOrEqualTo(this.math.bignumber(point.xcoord), this.math.bignumber(this.xWindowUpperString), epsilon)
        && (this.mathExtras.isEqual(this.math.bignumber(point.xcoord).add(this.math.bignumber(this.xWindowLowerString))
        .mod(this.xStepDelta), this.math.bignumber("0"), epsilon)
        || this.mathExtras.isEqual(this.math.bignumber(point.xcoord).add(this.math.bignumber(this.xWindowLowerString))
        .mod(this.xStepDelta), this.xStepDelta, epsilon))
      );
    }
  }

  // This takes and has sorted the points passed to it then calculates unknown points. Calculated points are then saved in the DB.
  getNewPoints(knownPoints: Point[], equation: string): Point[] {
    let newPoints: Point[] = [];
    let currXVal!: math.BigNumber;
    let currYVal!: math.BigNumber;
    let sortedPoints: Point[] = this.sortKnownPoints(knownPoints);

    for (const [index, point] of sortedPoints.entries()) {
      if (point !== undefined) {
        continue;
      }

      currXVal = this.math.bignumber(this.xWindowLowerString).add(this.xStepDelta.mul(index % (parseInt(this.yStepsString!) + 1)));

      if (this.graphType === "2D" || this.graphType === "constant") {
        sortedPoints[index] = {id: undefined!, equation: equation, xcoord: currXVal.toString(),
          ycoord: this.math.evaluate(equation, {x: this.math.bignumber(currXVal)}).toString(), zcoord: null};
      }
      // Program keeps calculating the final yStepsString number of points for 3D graphs.
      else if (this.graphType === "3D") {
        currYVal = this.math.bignumber(this.yWindowLowerString).add(this.yStepDelta.mul(this.math
        .floor(index / (parseInt(this.yStepsString!) + 1))));

        sortedPoints[index] = {id: undefined!, equation: equation, xcoord: currXVal.toString(),
          ycoord: currYVal.toString(), zcoord: this.math.evaluate(equation,
          {x: this.math.bignumber(currXVal), y: this.math.bignumber(currYVal)}).toString()};
      }

      newPoints.push(sortedPoints[index]);
    }

    this.newPointsFoundCount += newPoints.length;

    // TODO: There's a payload too large error for many, many point calls. Break up requests into a while loop.
    // Try doing something like wrapping this in a while loop with a condition that newPoints.length !== 0.
    // Then call the .subscribe() and delete the packet of points(maybe through .splice() in the call, or after it)
    // then continue the loop. Keep calling and deleting until nothing is left.
    // We don't want to save constant functions to the DB. They are simple enough to calculate every time.
    if (this.graphType !== "constant") {
      this.graphService.createPoints(newPoints).subscribe(() => {
        console.log("Newly calculated points: " + newPoints.length);
      });
    }

    return sortedPoints;
  }

  // Sorts the points passed into a large unfilled array according to where the points should be based on steps.
  // Occasionally, bugs might cause the same points to be saved. This function doesn't care about that and repeated
  // points simply overwrite one another.
  sortKnownPoints(knownPoints: Point[]): Point[] {
    let sortedPoints: Point[] = [];

    if (this.graphType === "2D" || this.graphType === "constant") {
      sortedPoints.length = parseInt(this.xStepsString) + 1;
    }
    else if (this.graphType === "3D") {
      sortedPoints.length = (parseInt(this.xStepsString) + 1) * (parseInt(this.yStepsString) + 1);
    }

    knownPoints.forEach((point: Point) => {
      let index: number = parseInt(this.math.round(this.math.bignumber(point.xcoord).minus(
      this.math.bignumber(this.xWindowLowerString)).dividedBy(this.math.bignumber(this.xStepDelta))).toString());

      // The program handles 3D traces by calculating a line of points ascending the x-axis before taking a step up y-axis.
      // This means that we can find which line on the y-axis the point is on by checking how many steps on the y it's done.
      // In short: The if below finds what line the point is on, the let above finds position on the point's line it is on.
      if (this.graphType === "3D") {
        index += parseInt(this.math.round(this.math.bignumber(point.ycoord).minus(this.math.bignumber(this.yWindowLowerString))
        .dividedBy(this.yStepDelta).mul(this.math.bignumber(parseInt(this.xStepsString) + 1))).toString());
      }

      sortedPoints[index] = point;
    })

    // Occasionally bugs can cause two of the same points to be present in the DB.
    // This is to keep track of the found points even if a bug is causing too many points to be sent.
    this.savedPointsFoundCount = sortedPoints.filter(point => point).length;

    return sortedPoints;
  }

  // TODO: There's an issue when requesting too many points from the program. It's an ArrayBuffer error.
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
        hovertemplate: `(%{x},%{y},%{z})` // %{x} is what tells PlotlyJS to display the xcoord for what point the cursor is on.
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

    if (this.graphData.length === 1) {
      layout.showlegend = true; // PlotlyJS does not support legend showing legend for surface plots, so this only matters for 2D.
      PlotlyJS.newPlot("plotlyChart", [trace], layout, config);
    }
    else {
      PlotlyJS.addTraces("plotlyChart", [trace]);
      // TODO: For 3D, get the name and keep tacking on each trace to the title string, then restyle.
      // This should then display the equation above the graph. This is to get around the fact that surface doesn't allow legends.
      PlotlyJS.relayout("plotlyChart", layout);
    }

    this.passDataToTestService();

    this.testService.checkForProblems();
  }

  // This is meant to keep test.service up to date with current data.
  // I like to keep passing data as the program runs to check inputs for any errors.
  passDataToTestService(): void {
    this.testService.equation = this.pointsToGraph[0].equation;
    this.testService.xWindowLowerString = this.xWindowLowerString;
    this.testService.xWindowUpperString = this.xWindowUpperString;
    this.testService.yWindowLowerString = this.yWindowLowerString;
    this.testService.yWindowUpperString = this.yWindowUpperString;
    this.testService.xStepsString = this.xStepsString;
    this.testService.yStepsString = this.yStepsString;
    this.testService.xStepDelta = this.xStepDelta;
    this.testService.yStepDelta = this.yStepDelta;
    this.testService.pointsToGraph = this.pointsToGraph;
    this.testService.graphData = this.graphData;
    this.testService.graphType = this.graphType;
    this.testService.newPointsFoundCount = this.newPointsFoundCount;
    this.testService.savedPointsFoundCount = this.savedPointsFoundCount;
    this.testService.totalPointsFoundCount = this.totalPointsFoundCount;
    this.testService.config = this.config;
    this.testService.math = this.math;
  }

  purgeGraph(): void {
    this.graphData = [];
    this.totalPointsFoundCount = 0;
    PlotlyJS.purge("plotlyChart");
  }

  ngOnInit(): void {
    // When the program loads, this tests the functions used to fix MathJS functions.
    this.testService.testMath();
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
// x. If so, we simply put a * between them and then the program won't error out and cause the user to have to put the * themselves.

// TODO: Implement some logic that replaces the need for the user to define how many steps to take. This would look like finding the
// derivative of the inputted function and comparing the value of the derivative at the previous point and the current point. If
// the difference between the too is too large, pick the point between the two and try again until the values are close enough. 

// TODO: The equation that is listed above the graph for something like 1/3x displays as 0.3333333333333333333333x, which is obnoxious.

// Maybe TODO: MathJS does not simplify expressions like tan(x)*cos(x) correctly. tan(x) = sin(x)/cos(x), so we should be able to
// substitute that in for tan(x), then .simplify() with MathJS to cancel out the cos(x). This would also give the added benefit by
// further simplifying down equations sent to the DB and cutting down the calculations, which would overall speed up the program
// for someone using equations like tan(x)*cos(x). It would allow them to pull from the DB using sin(x), which is more likely to be
// present than something like tan(x)*cos(x).

// TODO: Error: <path> attribute transform: Expected number, "translate(5.49139131172038…". is an error that comes when zooming
// extremely far into the graph. This only prints errors on the console, but the program doesn't stop running and nothing seems
// to break as a result. Read up on it to decide if this is something that should be worried about.

// TODO: If user does not have the Point table on the DB, then graphs cannot be shown due to and error. The program is meant 
// to work with a DB, but it would be nice if the DB breaks that the program still runs.