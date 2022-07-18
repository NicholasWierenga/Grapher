import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';
import { Point } from '../point';
import { Chart, registerables } from 'chart.js';
import { create, all, BigNumberDependencies } from 'mathjs';
import { BigNumber } from "bignumber.js";

@Component({
  selector: 'app-grapher',
  templateUrl: './grapher.component.html',
  styleUrls: ['./grapher.component.css']
})

export class GrapherComponent implements OnInit {
  equation: string = "";
  xWindowLowerString: string = "";
  xWindowUpperString: string = "";
  xStepsString: string = "";
  pointsToGraph: Point[] = [];
  badEquation: boolean = false;
  math = create(all, {number: 'BigNumber'});
  myChart: any;
  //yWindowLowerString: string = "";
  //yWindowUppeStringr: string = "";
  // yWindows are not used currently, because ChartJS does them automatically.
  // They could be used in the future, so they'll be left commented out.
  
  constructor(private graphService: GraphService) { 
    Chart.register(...registerables);
  }
  
  // TODO: This only is for 2d graphs. Consider making something that handles for cases involving 2 variables.
  // This would function like below, but calculate one variable, then loop through all values for the other variable
  // before calculating the next point.
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
            x: {
              min: this.xWindowLowerString,
              max: this.xWindowUpperString
            },
            // If yWindow adjustment is ever needed, below is what will be used.
            //y: {
            //  min: this.yWindowLower.toString(),
            //  max: this.yWindowUpper.toString()
            //}
          }
        }
    });
  }
  
  getPoints(): void {
    this.badEquation = false;
    this.pointsToGraph = [];
    let newPoints: Point[] = [];
    let xWindowLower: BigNumber = new BigNumber(this.xWindowLowerString);
    let xWindowUpper: BigNumber = new BigNumber(this.xWindowUpperString);
    let xSteps: BigNumber = new BigNumber(this.xStepsString);
    let currXVal: BigNumber = xWindowLower;
    let xStepDelta: BigNumber = new BigNumber(xWindowUpper.minus(xWindowLower).dividedBy(xSteps)); // to know how far to travel on x-axis before calculating new point

    console.log("Number of steps for this graph: " + xSteps.valueOf());
    console.log("Value of xStepDelta, the amount of distance crossed by each step: " + xStepDelta.valueOf());

    if (this.equation.trim() === "") {
      this.badEquation = true;
      return;
    }
    
    // BUG: It's possible that below will return more points than are needed, so consider adding
    // something to remove duplicates in pointsToGraph later on.
    this.graphService.getPoints(this.equation).subscribe(points => { // Points is an array of all points from the DB with the current equation.
      this.pointsToGraph = points.filter(point => 
        new BigNumber(point.xcoord).isGreaterThanOrEqualTo(xWindowLower) && new BigNumber(point.xcoord).isLessThanOrEqualTo(xWindowUpper) // filters for points in window range
        && (new BigNumber(point.xcoord).minus(xWindowLower)).mod(xStepDelta).isEqualTo(0) // filters points that are in the set of stepped points.
    );

    console.log(`Retrieved ${this.pointsToGraph.length} point(s) from the DB.`);

    while (currXVal.isLessThanOrEqualTo(xWindowUpper)) {
      if (this.pointsToGraph.some(point => point.xcoord === currXVal.toString())) { // We check if a point already exists here and skip the calculation if it does.
        currXVal = currXVal.plus(xStepDelta);
        continue;
      }

      let newPoint: Point = {id: undefined!, equation: this.equation, xcoord: currXVal.toString(),
        ycoord: this.math.evaluate(this.equation, {x: currXVal.valueOf()}).toString()}
      
      this.pointsToGraph.push(newPoint); // adds new point to the array
      newPoints.push(newPoint);

      currXVal = currXVal.plus(xStepDelta);
    }

    this.graphService.createPoints(newPoints).subscribe(() => { // Updates db with newly found points.
      console.log("Newly calculated points: " + newPoints.length);

      // This sorting is needed to avoid previously calculated points from appearing at the start of the array,
      // which causes those points to not be displayed by the ChartJS graph later on.
      this.pointsToGraph.sort(function(pointA, pointB)  {
        return new BigNumber(pointA.xcoord).minus(new BigNumber(pointB.xcoord)).s!
        // .s gives the sign of the difference between the two points, so it'll give 1 or -1 as a number,
        // which is returned in order to sort the array.
      })

      this.getGraph();
      });
    });
  }

  useTestValues(): void { // This is simply to avoid having to enter all parameters every time.
  this.xWindowLowerString = "-10";
  this.xWindowUpperString = "10";
  this.xStepsString = "100";
  //this.yWindowLower = new BigNumber(0);
  //this.yWindowUpper = new BigNumber(100);

  this.getPoints();
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