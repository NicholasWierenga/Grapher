using Grapher.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Grapher.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class GrapherController : Controller
    {
        GrapherContext grapherDB = new GrapherContext();

        // Returns point from the table with the equation's name.
        [HttpGet("points/{equation}")]
        public List<Point> QueryTable(string equation)
        {
            equation = FixEquation(equation);

            try
            {
                return grapherDB.Points.FromSqlRaw<Point>($"SELECT * FROM {equation};").AsSplitQuery().ToList();
            }
            catch
            {
                CreateTable(equation);
            }

            return grapherDB.Points.FromSqlRaw<Point>($"SELECT * FROM {equation};").AsSplitQuery().ToList();
        }

        [HttpPost("addPoints/{equation}")]
        public void AddSomePoints(string equation, List<Point> calculatedPoints)
        {
            equation = FixEquation(equation);
            string pointsToInsert = "";

            for (int i = 0; i < calculatedPoints.Count; i++)
            {
                if (calculatedPoints.Count - 1 == i)
                {
                    pointsToInsert += $"('{calculatedPoints[i].Xcoord}', '{calculatedPoints[i].Ycoord}', '{calculatedPoints[i].Zcoord}');";
                }
                else
                {
                    pointsToInsert += $"('{calculatedPoints[i].Xcoord}', '{calculatedPoints[i].Ycoord}', '{calculatedPoints[i].Zcoord}'),";
                }
            }

            grapherDB.Database.ExecuteSqlRaw(
                $"INSERT INTO {equation} (xcoord, ycoord, zcoord) "
                    + $"VALUES {pointsToInsert}"
            );

            //grapherDB.SaveChanges();
        }

        // A table is created with equation as the name. This is done to avoid the previous method
        // of sending all point objects back to the DB with the equation in them. This lead to having one
        // massive table that was expensive to search through. This method keeps us from having to
        // search through millions of points to find some matching the needed equation like before.
        public void CreateTable(string equation)
        {
            equation = FixEquation(equation);

            grapherDB.Database.ExecuteSqlRaw(
                $"CREATE TABLE {equation} ("
                    + "xcoord NVARCHAR(80) NOT NULL,"
                    + "ycoord NVARCHAR(80) NOT NULL,"
                    + "zcoord NVARCHAR(80),"
                + ");"
            );
        }
        // TODO(important): SQL table names can be at most 128 characters, so long expressions are no good.
        // An idea for this is to make a central table that stores the name of each equation.
        // Look through that central table for the equation, then alongside the equation should be
        // an identifier for the table we need. Then use that identifier to query the table for the data.

        // Equations are used for table names, but many math symbols aren't legal as SQL operations.
        // Because of that, many of the symbols need to be replaced by some text to identify them by.
        public string FixEquation(string equation)
        {
            equation = equation.Replace("=", "_");
            equation = equation.Replace("*", "_mult_");
            equation = equation.Replace("(", "_open_");
            equation = equation.Replace("<", "_open_");
            equation = equation.Replace("{", "_open_");
            equation = equation.Replace("[", "_open_");
            equation = equation.Replace(")", "_close_");
            equation = equation.Replace(">", "_close_");
            equation = equation.Replace("}", "_close_");
            equation = equation.Replace("]", "_close_");
            equation = equation.Replace("^", "_pow_");
            equation = equation.Replace("+", "_plus_");
            equation = equation.Replace("-", "_minus_");
            equation = equation.Replace(".", "_decimal_");
            equation = equation.Replace("÷", "_div_");
            equation = equation.Replace("%2F", "_div_"); // %2F is URL encoding for /.

            return equation;
        }
    }
}