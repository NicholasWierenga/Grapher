using Grapher.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Grapher.Controllers
{
    // TODO: Instead of doing 2 SELECT ... FROM statements to retrieve points, do 1 nested statement.
    [ApiController]
    [Route("[controller]")]
    public class GrapherController : Controller
    {
        GrapherContext grapherDB = new();

        // Returns a list of points for a given equation.
        [HttpGet("points/{equation}")]
        public List<Point> getPoints(string equation)
        {
            string tableName = FindTableName(equation);
            equation = equation.Replace("%2F", "/"); // %2F is URL encoding for /, so we swap it back here.

            if (tableName != "")
            {
                return grapherDB.Set<Point>().FromSqlRaw($"SELECT * FROM [{tableName}];")
                    .AsSplitQuery().ToList();
            }
            // If tableName is an empty string, that means that there was no record in Equations for equation.
            // We then insert the equation into Equations, find its tableName, then create that table as tableName.
            else
            {
                InsertEquation(equation);

                tableName = FindTableName(equation);

                CreateTable(tableName);

                return new List<Point>();
            }
        }

        // Creates a table in the DB that is used to store points for equation corresponding to tableName.
        // tableName is used instead of the equation for the table's title, because SQL table names can only
        // be up to 128 characters and do not allow most math symbols.
        public void CreateTable(string tableName)
        {
            grapherDB.Database.ExecuteSqlRaw(
                $"CREATE TABLE [{tableName}] ( "
                    + "xcoord NVARCHAR(80) NOT NULL, "
                    + "ycoord NVARCHAR(80) NOT NULL, "
                    + "zcoord NVARCHAR(80), "
                + " )"
            );
        }

        // Adds a row to the Equations table with the equation alongside its tableName
        public void InsertEquation(string equation)
        {
            try
            {
                grapherDB.Database.ExecuteSqlRaw(
                    $"INSERT INTO Equations "
                  + $"VALUES ('{equation}')"
                );
            }
            // If the try fails, that means there is no Equations table present, so we create Equations then redo the function.
            catch
            {
                CreateEquationsTable();

                InsertEquation(equation);
            }
        }

        // Looks through the Equations table for the equation. When that is found, it returns
        // its corresponding tableName.
        public string FindTableName(string equation)
        {
            string tableName = "";

            try
            {
                tableName = grapherDB.Set<EquationData>().FromSqlRaw(
                    $"SELECT * " +
                    $"FROM Equations " +
                    $"WHERE Equation = '{equation}'"
                    ).AsNoTracking().AsSingleQuery().FirstOrDefault()
                    .Table_Name.ToString();
            }
            catch { }

            return tableName;
        }

        // Takes the equation, finds its table's name, then dumps the points in there.
        [HttpPost("addPoints/{equation}")]
        public void AddPoints(string equation, List<Point> calculatedPoints)
        {
            string tableName = FindTableName(equation);
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
                $"INSERT INTO [{tableName}] (xcoord, ycoord, zcoord) "
              + $"VALUES {pointsToInsert}"
            );
        }

        // Creates the Equations table, which is the table used to store all equations used
        // and the tableName that holds each equation's points.
        public void CreateEquationsTable()
        {
            grapherDB.Database.ExecuteSqlRaw(
                $"CREATE TABLE Equations ("
               + "Equation NVARCHAR(400) NOT NULL,"
               + "Table_Name INTEGER IDENTITY(1, 1),"
               + ");"
            );
        }

        [HttpGet("clearPoints/{equation}")]
        public void ClearTable(string equation)
        {
            string tableName = FindTableName(equation);

            grapherDB.Database.ExecuteSqlRaw($"DELETE FROM [{tableName}]");
        }

        [HttpGet("countPoints/{equation}")]
        public List<Point> CountPoints(string equation)
        {
            string tableName = FindTableName(equation);

            // TODO: Fix this. Call Count(*) instead of *. This was a quick way to implement this feature,
            // but it will be removed soon.
            try
            {
                return grapherDB.Set<Point>().FromSqlRaw($"SELECT * FROM [{tableName}];")
                    .AsSplitQuery().ToList();
            }
            catch
            {
                return new List<Point>();
            }
        }
    }
}