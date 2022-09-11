import { Component, OnInit } from '@angular/core';
import { TestService } from '../test.service';
import { GraphService } from '../graph.service';
import { Point } from '../point';
import { BigNumber } from 'mathjs';
import * as PlotlyJS from 'plotly.js-dist-min';
import { MathExtrasService } from '../math-extras.service';
import { EquationData } from '../equationdata';

@Component({
  selector: 'app-grapher',
  templateUrl: './grapher.component.html',
  styleUrls: ['./grapher.component.css']
})

// The above issue also works for large decimal multiple of x.
export class GrapherComponent implements OnInit {
  equation: string = "";
  equationDatas!: EquationData[];
  xWindowLowerString!: string;
  xWindowUpperString!: string;
  yWindowLowerString!: string;
  yWindowUpperString!: string;
  xStepsString!: string;
  yStepsString!: string;
  xStepDelta!: math.BigNumber;
  yStepDelta!: math.BigNumber;
  graphData: Partial<PlotlyJS.PlotData>[] = [];
  newPointsFoundCount: number = 0;
  savedPointsFoundCount: number = 0;
  totalPointsUsed: number = 0;
  pointsForThisEquation: number = -1;
  math: math.MathJsStatic = this.mathExtras.math;
  
  constructor(private graphService: GraphService, private mathExtras: MathExtrasService,
    private testService: TestService) { }

  // This checks if the data the user is sending can be used. If not, error messages will be shown on the front-end.
  validateData(): void {
    let noInputIssues = true;
    this.xStepsString = this.xStepsString || "100";
    this.yStepsString = this.yStepsString || "100";
    this.xWindowLowerString = this.xWindowLowerString || "-10";
    this.yWindowLowerString = this.yWindowLowerString || "-10";

    // Later in the program we convert to bignumber these, so we want to make sure users
    // aren't entering something that can't be converted.
    try {
      this.math.bignumber(this.xWindowLowerString);

      this.xWindowUpperString = this.xWindowUpperString || this.math.bignumber(this.xWindowLowerString)
      .plus(this.math.bignumber("20")).toString();

      document.getElementById("badXLower")!.style.display = "none";
    }
    catch {
      document.getElementById("badXLower")!.style.display = "block";

      noInputIssues = false;
    }

    try {
      this.math.bignumber(this.yWindowLowerString);

      this.yWindowUpperString = this.yWindowUpperString || this.math.bignumber(this.yWindowLowerString)
      .plus(this.math.bignumber("20")).toString();

      document.getElementById("badYLower")!.style.display = "none";
    }
    catch {
      document.getElementById("badYLower")!.style.display = "block";

      noInputIssues = false;
    }

    try {
      this.math.bignumber(this.xWindowUpperString);
      document.getElementById("badXUpper")!.style.display = "none";
    }
    catch {
      document.getElementById("badXUpper")!.style.display = "block";

      noInputIssues = false;
    }

    try {
      this.math.bignumber(this.yWindowUpperString);

      document.getElementById("badYUpper")!.style.display = "none";
    }
    catch {
      document.getElementById("badYUpper")!.style.display = "block";

      noInputIssues = false;
    }

    // Checks if we have x windows that can be used then checks if lower is less than upper.
    if (document.getElementById("badXLower")!.style.display === "none" 
     && document.getElementById("badXUpper")!.style.display === "none") {
      if (this.mathExtras.isLessThanOrEqualTo(this.math.bignumber(this.xWindowUpperString)
        , this.math.bignumber(this.xWindowLowerString), this.math.bignumber("1e-32"))) {
        document.getElementById("badXWindow")!.style.display = "block";

        noInputIssues = false;
      }
      else {
        document.getElementById("badXWindow")!.style.display = "none";
      }
    }

    if (document.getElementById("badYLower")!.style.display === "none" 
    && document.getElementById("badYUpper")!.style.display === "none") {
      if (this.mathExtras.isLessThanOrEqualTo(this.math.bignumber(this.yWindowUpperString)
        , this.math.bignumber(this.yWindowLowerString), this.math.bignumber("1e-32"))) {
        document.getElementById("badYWindow")!.style.display = "block";

        noInputIssues = false;
      }
      else {
        document.getElementById("badYWindow")!.style.display = "none";
      }
    }

    try {
      this.math.bignumber(this.xStepsString);

      document.getElementById("badXSteps")!.style.display = "none";
    }
    catch {
      document.getElementById("badXSteps")!.style.display = "block";

      noInputIssues = false;
    }

    // These require converting the string into a bignumber, which is why we have the if statement.
    // This if statement can only ever be passed if the above try did not fail.
    if (document.getElementById("badXSteps")!.style.display === "none") {
      if (this.mathExtras.isLessThan(this.math.bignumber(this.xStepsString), this.math.bignumber("0"))) {
        document.getElementById("badXStepsIsNegative")!.style.display = "block";
        noInputIssues = false;
      }
      else {
        document.getElementById("badXStepsIsNegative")!.style.display = "none";
      }

      if (this.math.round(this.math.bignumber(this.xStepsString)).toString() 
          !== this.math.bignumber(this.xStepsString).toString()) {
        document.getElementById("badXStepsIsDecimal")!.style.display = "block";
        noInputIssues = false;
      }
      else {
        document.getElementById("badXStepsIsDecimal")!.style.display = "none";
      }
    }

    try {
      this.math.bignumber(this.yStepsString);
      document.getElementById("badYSteps")!.style.display = "none";
    }
    catch {
      document.getElementById("badYSteps")!.style.display = "block";
      noInputIssues = false;
    }

    if (document.getElementById("badYSteps")!.style.display === "none") {
      if (this.mathExtras.isLessThan(this.math.bignumber(this.yStepsString), this.math.bignumber("0"))) {
        document.getElementById("badYStepsIsNegative")!.style.display = "block";
        noInputIssues = false;
      }
      else {
        document.getElementById("badYStepsIsNegative")!.style.display = "none";
      }

      if (this.math.round(this.math.bignumber(this.yStepsString)).toString() 
      !== this.math.bignumber(this.yStepsString).toString()) {
        document.getElementById("badYStepsIsDecimal")!.style.display = "block";
        noInputIssues = false;
      }
      else {
        document.getElementById("badYStepsIsDecimal")!.style.display = "none";
      }
    }

    this.validateEquation(this.equation);
    
    if (noInputIssues) {
      this.newPointsFoundCount = 0;
      this.savedPointsFoundCount = 0;

      this.findTrace(this.equation);
      
      this.redoTraces();
    }
  }

  // Takes the user's equations and checks for errors and returns an equation that can be worked with.
  validateEquation(equation: string): void {
    if (equation.trim().length === 0) {
      document.getElementById("badEquation")!.style.display = "block";

      return;
    }
    else {
      document.getElementById("badEquation")!.style.display = "none";
    }

    // This takes the user's input, which MathJS allows to be an equation if they want, then records the 
    // variables used. Later on, we fix the variables to be x and y if needed and make it into a valid equation.
    let expression: string = this.math.simplify(equation.split("=")[equation.split("=").length - 1]).toString();
    let variables: string = this.getVariables(expression);
    let onlyVariables: Set<string> = new Set(variables.replace(/\s+/g, ""));

    if (onlyVariables.size > 2) {
      document.getElementById("badEquationTooManyVariables")!.style.display = "block";
      return;
    }
    else {
      document.getElementById("badEquationTooManyVariables")!.style.display = "none";
    }

    // Checks if expression has valid variables then fixes them
    if ((onlyVariables.has("x") && onlyVariables.size === 1) || !(onlyVariables.has("x") && onlyVariables.has("y"))) {
      expression = this.fixExpressionVariables(expression, variables);
    }

    this.equation = this.getEquation(expression, onlyVariables);
  }

  // Recalculates previously used equations at the new window settings and steps.
  redoTraces(): void {
    let amountOfRedos: number = 0;
    let startingEquation: string = this.equation;
    let startData = this.graphData;

    // TODO: Currently, switching windows doesn't update all data to correct values.
    // Try swapping startData out for graphData and use the index to update values instead of
    // creating a copy of the traces.
    // Looks through previous traces, redoing whatever according to the window settings.
    startData.forEach(data => {
      // The .split(",") is for 3D data. Those return an array filled with the same number, but we only want one.
      let oldLowerXString: string = data.x![0]!.toString().split(",")[0];
      let oldUpperXString: string = data.x![data.x!.length - 1]!.toString().split(",")[0];
      if (startingEquation.includes("z")) {
        oldUpperXString = data.x![0]!.toString().split(",")[data.x!.length - 1];
      }
      let oldLowerYString: string = data.y![0]!.toString().split(",")[0];
      let oldUpperYString: string = data.y![data.y!.length - 1]!.toString().split(",")[0];

      // We redo any traces found to have different window settings.
      if (((oldLowerXString !== this.xWindowLowerString || oldUpperXString !== this.xWindowUpperString) && data.name!.includes("y="))
       || ((oldLowerYString !== this.yWindowLowerString || oldUpperYString !== this.yWindowUpperString) && data.name!.includes("z=")
         || oldLowerXString !== this.xWindowLowerString || oldUpperXString !== this.xWindowUpperString)) {
        this.findTrace(data.name!);

        amountOfRedos++;
      }
    })

    console.log(`Amount of redone equations: ${amountOfRedos}.`);

    this.equation = startingEquation.split("=")[1]; // Sets the user equation back to something simple.
  }

  findTrace(equation: string): void {
    this.xStepDelta = this.math.bignumber(this.xWindowUpperString).minus(this.xWindowLowerString).dividedBy(this.xStepsString);

    if (equation.includes("z")) {
      this.yStepDelta = this.math.bignumber(this.yWindowUpperString).minus(this.yWindowLowerString).dividedBy(this.yStepsString);
    }

    this.checkEquation(equation);

    // This graphs a constant-value function. Since these are very simple, they're calculated each time and not saved.
    if (equation.match(/[\d\.]+/)?.toString() === equation.split("=")[1]) {
      let points: Point[] = this.getNewPoints(equation, []);

      this.getGraph(equation, points);
    }
    else {
      this.getAllPoints(equation);
    }
  }

  // Checks the equation for if it's already been graphed or if the equation requires a different type of graph.
  checkEquation(equation: string): void {
    for (const data of this.graphData) {
      if (equation[0] !== data.name![0]) { // Checks if the current equation contains the same starting letter (y or z).
        console.log("Dimension mis-match found. Deleting graph.");
        this.purgeGraph();

        break;
      }
    };
    
    let indexOfEquation: number = this.graphData.findIndex(data => data.name === equation);
    if (indexOfEquation !== -1) {
      console.log("This equation was already used before. Deleting trace.");
      
      PlotlyJS.deleteTraces("plotlyChart", indexOfEquation);

      // This removes the amount of points in the trace from totalPointsUsed. They're re-added later on.
      if (equation.includes("z")) {
        this.totalPointsUsed -= this.graphData[indexOfEquation].x!.length * this.graphData[indexOfEquation].y!.length;
      }
      else {
        this.totalPointsUsed -= this.graphData[indexOfEquation].x!.length;
      }

      this.graphData.splice(indexOfEquation, 1);
    }
  }

  // This takes in our expression and returns what variables the user entered.
  getVariables(expression: string): string {
    let variables: string = expression.replace(/[0-9+\-*.(){}\[\]\/<>^]/g, " ");
    
    let toRemove: string[] = ["sinh", "cosh", "sech", "csch", "tanh", "coth",
    "sin", "cos", "sec", "csc", "tan", "cot", "e"];

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
  fixExpressionVariables(expression: string, variables: string): string {
    let variableSet: Set<string> = new Set(variables.split(""));
    let index: number = -1;
    variableSet.delete(" ");

    variableSet.forEach(char => { // Iterates through each variable used, replacing the non-x/y with x and y.
      if (char === "x" || (char === "y" && variableSet.size !== 1)) {
        return; // This is JS's way of doing continue in a for loop.
      }
      
      while (variables.includes(char)) {
        index = variables.indexOf(char);

        if (expression[index] === [...variableSet][0]) { // [...varSet] turns the set into an array
          expression = expression.substring(0, index) + "x" + expression.substring(index + 1, expression.length);
          variables = variables.substring(0, index) + "x" + variables.substring(index + 1, variables.length);
        }

        if (expression[index] === [...variableSet][1]) {
          expression = expression.substring(0, index) + "y" + expression.substring(index + 1, expression.length);
          variables = variables.substring(0, index) + "y" + variables.substring(index + 1, variables.length);
        }
      }
    });

    return expression;
  }

  // Takes in the expression and variables used then returns a proper equation.
  getEquation(expression: string, variablesUsed: Set<string>): string {
    expression = this.math.simplify(expression, {}, { exactFractions: true }).toString().replace(/\s+/g, "");
    
    if (variablesUsed.size <= 1) {
      return `y=${expression}`;
    }
    else {
      return `z=${expression}`;
    }
  }

  // Retrieves points from DB and then calculates unknown points.
  getAllPoints(equation: string): void {
    let pointsToGraph: Point[] = [];

    this.graphService.getPoints(equation).subscribe(points => {
      pointsToGraph = this.filterPoints(equation, points);

      console.log(`Retrieved ${pointsToGraph.length} point(s) from the DB.`);
      
      pointsToGraph = this.getNewPoints(equation, pointsToGraph);
      
      this.getGraph(equation, pointsToGraph);
    });
  }

  // This filters out points depending on the user's amount of steps and windows for x and y.
  filterPoints(equation: string, points: Point[]): Point[] {
    let epsilon: BigNumber = this.math.bignumber("1e-32");

    if (equation.includes("z")) {
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
  getNewPoints(equation: string, knownPoints: Point[]): Point[] {
    let newPoints: Point[] = [];
    let currXVal!: math.BigNumber;
    let currYVal!: math.BigNumber;
    let sortedPoints: Point[] = this.sortKnownPoints(equation, knownPoints);

    // We iterate through an array, filling in undefined elements with points according to index.
    for (const [index, point] of sortedPoints.entries()) {
      if (point !== undefined) {
        continue;
      }

      currXVal = this.math.bignumber(this.xWindowLowerString).add(this.xStepDelta.mul(index % (parseInt(this.yStepsString!) + 1)));
      
      if (equation.includes("z")) {
        currYVal = this.math.bignumber(this.yWindowLowerString).add(this.yStepDelta
          .mul(this.math.floor(index / (parseInt(this.yStepsString!) + 1))));

        sortedPoints[index] = {xcoord: currXVal.toString(), ycoord: currYVal.toString()
          , zcoord: this.math.evaluate(equation, {x: currXVal, y: currYVal}).toString()};
      }
      else {
        sortedPoints[index] = {xcoord: currXVal.toString(), ycoord: this.math.evaluate(equation, {x: currXVal}).toString()
          , zcoord: null};
      }

      newPoints.push(sortedPoints[index]);
    }

    this.newPointsFoundCount += newPoints.length;

    // We don't want to save constant functions to the DB. They are simple enough to calculate every time.
    if (equation.match(/[\d\.]+/)?.toString() !== equation.split("=")[1] && newPoints.length !== 0) {
      if (this.equationDatas.findIndex(data => data.equation === equation) === -1) {
        this.equationDatas.push({ equation: equation, table_Name: -1, count: 0 })
      }

      this.addPoints(equation, newPoints, newPoints.length);
    }

    return sortedPoints;
  }

  addPoints(equation: string, pointsToAdd: Point[], totalPointCount: number, packetNumber?: number): void {
    packetNumber = packetNumber ?? 1;
    let maxPacketSize: number = 1000;
    let amountToSend: number = pointsToAdd.length % maxPacketSize;
    let packetAmount: number = this.math.ceil(totalPointCount / maxPacketSize);

    // We insert using an INSERT VALUES statement on the backend, so we send in packets of 1000 points.
    if (pointsToAdd.length % maxPacketSize === 0) {
      amountToSend = maxPacketSize;
    }
    else {
      amountToSend %= maxPacketSize;
    }

    this.graphService.createPoints(equation, pointsToAdd.splice(0, amountToSend)).subscribe(() => {
      this.equationDatas.find(data => data.equation === equation)!.count += amountToSend;

      console.log(`Sent packet ${packetNumber} of ${packetAmount} with ${amountToSend} points.`);

      if (pointsToAdd.length > 0) {
        console.log(`${pointsToAdd.length} still need to be sent.`);

        this.addPoints(equation, pointsToAdd, totalPointCount, packetNumber! + 1);
      }
      else {
        console.log(`All points have been sent.`);
      }
    });
  }

  // Sorts the points passed into a large unfilled array according to where the points should be based on steps.
  // Occasionally, bugs might cause the same points to be saved. This function doesn't care about that and repeated
  // points simply overwrite one another.
  sortKnownPoints(equation: string, knownPoints: Point[]): Point[] {
    let sortedPoints: Point[] = [];

    if (equation.includes("z")) {
      sortedPoints.length = (parseInt(this.xStepsString) + 1) * (parseInt(this.yStepsString) + 1);
    }
    else {
      sortedPoints.length = parseInt(this.xStepsString) + 1;
    }

    knownPoints.forEach((point: Point) => {
      let index: number = parseInt(this.math.round(this.math.bignumber(point.xcoord).minus(
        this.math.bignumber(this.xWindowLowerString)).dividedBy(this.math.bignumber(this.xStepDelta))).toString());

      // The program handles 3D traces by calculating a line of points ascending the x-axis before taking a step up y-axis.
      // This means that we can find which line on the y-axis the point is on by checking how many steps on the y it's done.
      // In short: The if below finds what line the point is on, the let above finds position on the point's line it is on.
      if (equation.includes("z")) {
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

  getGraph(equation: string, points: Point[]): void {
    let layout: Partial<PlotlyJS.Layout> = {
      xaxis: {range: [this.xWindowLowerString, this.xWindowUpperString]}
    };
    
    if (this.yWindowLowerString !== "" && this.yWindowUpperString !== "") {
      layout.yaxis = {range: [this.yWindowLowerString, this.yWindowUpperString]};
    }

    var trace: Partial<PlotlyJS.PlotData> = this.getTrace(equation, points);

    this.graphData.push(trace);

    if (this.graphData.length === 1) {
      PlotlyJS.newPlot("plotlyChart", [trace], layout);
    }
    else {
      PlotlyJS.addTraces("plotlyChart", [trace]);
      PlotlyJS.relayout("plotlyChart", layout);
    }

    this.passDataToTestService();

    this.testService.checkForProblems(points, trace.name!);
  }

  // Takes in an array of points and splits it up into PlotlyJS data.
  getTrace(equation: string, points: Point[]): Partial<PlotlyJS.PlotData> {
    this.totalPointsUsed += points.length;

    if (equation.includes("z")) {
      let splitPoints: Point[][] = [];
      let startAtIndex: number = 0;
      let endAtIndex: number = parseInt(this.xStepsString) + 1;

      // Because we sorted pointsToGraph by xcoord, we can split it apart into a number of arrays, each with the same xcoord
      while (startAtIndex < points.length) {
        splitPoints.push(points.slice(startAtIndex, endAtIndex));

        startAtIndex = endAtIndex;
        endAtIndex += parseInt(this.xStepsString) + 1;
      }

      // PlotlyJS likes to have 3d graph data that is split up into a number of arrays, each one signifying a line.
      // For here, since we sorted by xcoord above, splitPoints[0] would correspond to the line of points along y-axis.
      // Without splitting the array, PlotlyJS assumes everything is contained on one great big line and starts 
      // connecting points and forming surfaces together, often causing false surfaces in the output.
      var trace: Partial<PlotlyJS.PlotData> = {
        x: splitPoints.map(pointArray => pointArray.map(point => point.xcoord)),
        y: splitPoints.map(pointArray => pointArray.map(point => point.ycoord)),
        z: splitPoints.map(pointArray => pointArray.map(point => point.zcoord)),
        name: equation,
        type: "surface",
        hovertemplate: `(%{x},%{y},%{z})` // %{x} is what tells PlotlyJS to display the xcoord for what point the cursor is on.
      };
    }
    else {
      var trace: Partial<PlotlyJS.PlotData> = {
        x: points.map(point => point.xcoord),
        y: points.map(point => point.ycoord),
        name: equation,
        type: "scatter",
        hovertemplate: `(%{x},%{y})`
      };
    }

    return trace;
  }

  // This is meant to keep test.service up to date with current data.
  // I like to keep passing data as the program runs to check inputs for any errors.
  passDataToTestService(): void {
    this.testService.xWindowLowerString = this.xWindowLowerString;
    this.testService.xWindowUpperString = this.xWindowUpperString;
    this.testService.yWindowLowerString = this.yWindowLowerString;
    this.testService.yWindowUpperString = this.yWindowUpperString;
    this.testService.xStepsString = this.xStepsString;
    this.testService.yStepsString = this.yStepsString;
    this.testService.xStepDelta = this.xStepDelta;
    this.testService.yStepDelta = this.yStepDelta;
    this.testService.graphData = this.graphData;
    this.testService.newPointsFoundCount = this.newPointsFoundCount;
    this.testService.savedPointsFoundCount = this.savedPointsFoundCount;
    this.testService.totalPointsUsed = this.totalPointsUsed;
  }

  purgeGraph(): void {
    this.graphData = [];
    this.totalPointsUsed = 0;
    
    PlotlyJS.purge("plotlyChart");
  }

  clearPoints(equation: string): void {
    this.graphService.clearPoints(equation).subscribe(() => {
      this.equationDatas[this.equationDatas.findIndex(data => data.equation === equation)].count = 0
    });
  }

  // Used to graph already known points. This pulls in all points for the equation in the DB and graphs them.
  // Scatterplots are used because sets of points can have gaps between them and PlotlyJS lines try to connect
  // those, which causes visual problems. Scatter plots does not connect points.
  graphPoints(equation: string): void {
    this.purgeGraph();

    this.graphService.getPoints(equation).subscribe(points => {
      if (equation.includes("z")) {
        var trace: Partial<PlotlyJS.PlotData> = {
          x: points.map(point => point.xcoord),
          y: points.map(point => point.ycoord),
          z: points.map(point => point.zcoord),
          name: equation,
          mode: 'markers',
          marker: {size: 1},
          type: 'scatter3d',
          hovertemplate: `(%{x},%{y},%{z})` // %{x} is what tells PlotlyJS to display the xcoord for what point the cursor is on.
        };
      }
      else {
        var trace: Partial<PlotlyJS.PlotData> = {
          x: points.map(point => point.xcoord),
          y: points.map(point => point.ycoord),
          name: equation,
          mode: 'markers',
          marker: {size: 1},
          hovertemplate: `(%{x},%{y})`
        };
      }
      this.savedPointsFoundCount = trace.x!.length;
      this.totalPointsUsed = this.savedPointsFoundCount;

      this.graphData.push(trace);

      PlotlyJS.newPlot("plotlyChart", [trace]);
    });
  }

  ngOnInit(): void {
    // When the program loads, this tests the functions used to fix MathJS functions.
    this.testService.testMath();

    this.graphService.getEquationDatas().subscribe(equationDatas => this.equationDatas = equationDatas);
  }
}

// This is an area for TODO's that would be nice to implement, but won't prevent the program from functioning,
// so they're not terribly important.

// TODO: A function like sin(x)+cos(x*(sin(x))) will work, but the functions sin(x)+cos(x(sin(x))) and sin(x)+cos(xsin(x)) won't
// and I would like those to work also. MathJS can do .simplify() to get rid of redundant ()'s, but it would be nice to add something
// into the program that identifies that xsin(x) means x*sin(x). This would probably look something like identifying that x is next
// to a non-variable letter, which indicates it's meant to act as a multiple of some function. This could be done by instead of
// searching through and spacing-out found trig functions, we give some other value like # and so we check if # is adjacent
// x. If so, we simply put a * between them and then the program won't error out and cause the user to have to put the * themselves.

// Maybe TODO: MathJS does not simplify expressions like tan(x)*cos(x) correctly. tan(x) = sin(x)/cos(x), so we should be able to
// substitute that in for tan(x), then .simplify() with MathJS to cancel out the cos(x). This would also give the added benefit by
// further simplifying down equations sent to the DB and cutting down the calculations, which would overall speed up the program
// for someone using equations like tan(x)*cos(x). It would allow them to pull from the DB using sin(x), which is more likely to be
// present than something like tan(x)*cos(x).

// TODO: If user does not have the Point table on the DB, then graphs cannot be shown due to and error. The program is meant 
// to work with a DB, but it would be nice if the DB breaks that the program still runs.
