import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EquationData } from './equationdata';
import { Point } from './point';

@Injectable({
  providedIn: 'root'
})

export class GraphService {
  urlRoot: string;
  headers = new HttpHeaders().set('Content-Type', 'application/json; charset=utf-8'); // We don't need headers or requestOption, but it makes console less bad.
  requestOptions: Object = {
    headers: this.headers
  };

  constructor(private http: HttpClient, @Inject('BASE_URL') baseUrl: string) {
    this.urlRoot = baseUrl;
  }

  getPoints(equation: string): Observable<Point[]> {
    equation = equation.replace(/\/+/g, "%2F"); // Equations with / mess with the URL and cause errors. %2F is code for /.

    return this.http.get<Point[]>(this.urlRoot + `grapher/points/${equation}`);
  }

  createPoints(equation: string, pointsToAdd: Point[]): Observable<Point[]> {
    equation = equation.replace(/\/+/g, "%2F");

    return this.http.post<Point[]>(this.urlRoot + `grapher/addPoints/${equation}`, pointsToAdd, this.requestOptions);
  }

  clearPoints(equation: string): Observable<void> {
    return this.http.get<void>(this.urlRoot + `grapher/clearPoints/${equation}`);
  }

  getEquationDatas(): Observable<EquationData[]> {
    return this.http.get<EquationData[]>(this.urlRoot + `grapher/getDatas`, this.requestOptions);
  }
}
