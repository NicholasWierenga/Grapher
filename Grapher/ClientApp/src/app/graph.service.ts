import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
    equation = equation.replace("/", "%2F"); // equations with / mess with the URL. %2F is the code for /.
    return this.http.get<Point[]>(this.urlRoot + `grapher/points/${equation}`);
  }

  createPoints(pointsToAdd: Point[]): Observable<Point[]> {
    return this.http.post<Point[]>(this.urlRoot + "grapher/addPoints", pointsToAdd, this.requestOptions);
  }
}
