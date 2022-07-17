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
  equation: string = "";
  xWindowLower: BigNumber = new BigNumber(0);
  xWindowUpper: BigNumber = new BigNumber(12);
  yWindowLower: BigNumber = new BigNumber(0); // These ywindows maybe should be deleted and have them decided
  yWindowUpper: BigNumber = new BigNumber(100);
  xSteps: BigNumber = new BigNumber(5); // Hardcoded currently, but intended to be adjustable by user.
  pointsToGraph: Point[] = [];
  badEquation: boolean = false;
  math = create(all, {number: 'BigNumber'});
  xStepDelta: BigNumber = new BigNumber(this.xWindowUpper.minus(this.xWindowLower).dividedBy(this.xSteps)); // to know how far to travel on x-axis before calculating new point
  
  constructor(private graphService: GraphService) { 
    Chart.register(...registerables);
  }
  
  // TODO: This only is for 2d graphs. Consider making something that handles for cases involving 2 variables.
  // This would function like below, but calculate one variable, then loop through all values for the other variable
  // before calculating the next point.
  getGraph(): void {
    console.log("Number of steps taken for this: " + this.xSteps.valueOf());
    console.log("Value of xStepDelta, the amount of distance crossed for each step: " + this.xStepDelta.valueOf());
    
    // Line Chart
    const lineCanvasEle: any = document.getElementById('myChart')
    const myChart = new Chart(lineCanvasEle.getContext('2d'), {
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
              min: this.xWindowLower.toString(),
              max: this.xWindowUpper.toString()
            }

            // If y-window are something that's wanted, it'd be here.
          }
        }
    });
  }
  
  getPoints(): void {
    this.badEquation = false;
    let currXVal: BigNumber = this.xWindowLower;
    let newPoints: Point[] = [];
    // TODO: Trying to graph another expression causes an error. Canvas must be destroyed first in order to do this.
    // There's probably a function that does this on ChartJS.

    if (this.equation === "") {
      this.badEquation = true;
      return;
    }
    
    // BUG: It's possible that below will return more points than are needed, so consider adding
    // something to remove duplicates in pointsToGraph later on.
    this.graphService.getPoints(this.equation).subscribe(points => { // Points is an array of all points from the DB with the current equation.
      this.pointsToGraph = points.filter(point => 
        new BigNumber(point.xcoord).isGreaterThanOrEqualTo(this.xWindowLower) && new BigNumber(point.xcoord).isLessThanOrEqualTo(this.xWindowUpper) // filters for points in window range
        && (new BigNumber(point.xcoord).minus(this.xWindowLower)).mod(this.xStepDelta).isEqualTo(new BigNumber(0)) // filters points that are in the set of stepped points.
    );
    console.log(`Retrieved ${this.pointsToGraph.length} point(s) from the DB.`);


    while (currXVal.isLessThanOrEqualTo(this.xWindowUpper)) {
      if (this.pointsToGraph.some(point => point.xcoord === currXVal.toString())) { // We check if a point already exists here and skip the calculation if it does.
        currXVal = currXVal.plus(this.xStepDelta);
        continue;
      }

      let newPoint: Point = {id: undefined!, equation: this.equation, xcoord: currXVal.toString(),
        ycoord: this.math.evaluate(this.equation, {x: currXVal.valueOf()}).toString()}
      
      this.pointsToGraph.push(newPoint); // adds new point to the array
      newPoints.push(newPoint);

      currXVal = currXVal.plus(this.xStepDelta);
    }

    this.graphService.createPoints(newPoints).subscribe(() => {
      console.log("Newly calculated points: " + newPoints.length);

      this.getGraph();
      }); // Updates db with newly found points.
    });
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