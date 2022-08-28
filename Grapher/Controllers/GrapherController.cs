using Grapher.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;

namespace Grapher.Controllers
{
    // TODO: Instead of doing 2 SELECT ... FROM statements to retrieve points, do 1 nested statement.
    // TODO: Try getting equationData at the start and looking through that for the info instead of
    // doing FindTableName. This will help avoid constantly searching the DB.
    [ApiController]
    [Route("[controller]")]
    public class GrapherController : Controller
    {
        private static GrapherContext grapherDB = new();
        private static List<EquationData> equationData = new();

        // Returns a list of points for a given equation.
        [HttpGet("points/{equation}")]
        public List<Point> GetPoints(string equation)
        {
            equation = equation.Replace("%2F", "/"); // %2F is URL encoding for /, so we swap it back here.
            EquationData? data = equationData.Find(data => data.Equation == equation);

            if (data != null)
            {
                return grapherDB.Set<Point>().FromSqlRaw(
                            $"SELECT * FROM [{data.Table_Name}]"
                        ).ToList();
            }
            // If tableName is an empty string, that means that there was no record in Equations for equation.
            // We then insert the equation into Equations, find its tableName, then create that table as tableName.
            else
            {
                InsertEquation(equation);

                // InsertEquations adds a new element to the end of equationData.
                data = equationData.Last();

                CreateTable(data!.Table_Name);

                return new List<Point>();
            }
        }

        // Creates a table in the DB that is used to store points for equation corresponding to tableName.
        // tableName is used instead of the equation for the table's title, because SQL table names can only
        // be up to 128 characters and do not allow most math symbols.
        public void CreateTable(int tableName)
        {
            grapherDB.Database.ExecuteSqlRaw(
                $"CREATE TABLE [{tableName}] ( "
                    + "xcoord NVARCHAR(80) NOT NULL, "
                    + "ycoord NVARCHAR(80) NOT NULL, "
                    + "zcoord NVARCHAR(80), "
                + ")"
            );
        }

        // Adds a row to the Equations table with the equation alongside its tableName
        public void InsertEquation(string equation)
        {
            try
            {
                grapherDB.Database.ExecuteSqlRaw(
                    $"INSERT INTO Equations (Equation, Count)"
                  + $"VALUES ('{equation}', 0)"
                );

                int tableName = grapherDB.Equations.FromSqlRaw(
                        $"SELECT * FROM [Equations]"
                    ).ToList().Last().Table_Name;

                equationData.Add(new() { Equation = equation, Table_Name = tableName, Count = 0 });
            }
            // If the try fails, that means there is no Equations table present, so we create Equations then redo the function.
            catch
            {
                CreateEquationsTable();

                InsertEquation(equation);
            }
        }

        // Takes the equation, finds its table's name, then dumps the points in there.
        [HttpPost("addPoints/{equation}")]
        public void AddPoints(string equation, List<Point> calculatedPoints)
        {
            equation = equation.Replace("%2F", "/");
            EquationData? data = equationData.Find(data => data.Equation == equation);
            string pointsToInsert = "";

            for (int i = 0; i < calculatedPoints.Count; i++)
            {
                if (calculatedPoints.Count - 1 == i)
                {
                    pointsToInsert += $"('{calculatedPoints[i].Xcoord}', '{calculatedPoints[i].Ycoord}', " +
                        $"'{calculatedPoints[i].Zcoord}');";
                }
                else
                {
                    pointsToInsert += $"('{calculatedPoints[i].Xcoord}', '{calculatedPoints[i].Ycoord}', " +
                        $"'{calculatedPoints[i].Zcoord}'),";
                }
            }

            grapherDB.Database.ExecuteSqlRaw(
                    $"INSERT INTO [{data!.Table_Name}] (xcoord, ycoord, zcoord) "
                  + $"VALUES {pointsToInsert}"
                );

            UpdateEquationData(data!.Equation, calculatedPoints.Count);
        }

        public void UpdateEquationData(string equation, int count)
        {
            int index = equationData.FindIndex(data => data.Equation == equation);

            if ( count > 0 )
            {
                equationData[index].Count += count;

                grapherDB.Database.ExecuteSqlRaw(
                        $"UPDATE [Equations] " +
                        $"SET [Count] = [Count] + {count}" +
                        $"WHERE [Equation] = '{equation}'"
                    );
            }
            else
            {
                equationData[index].Count = 0;

                grapherDB.Database.ExecuteSqlRaw(
                        $"UPDATE [Equations] " +
                        $"SET [Count] = 0" +
                        $"WHERE [Equation] = '{equation}'"
                    );
            }
        }

        // Creates the Equations table, which is the table used to store all equations used
        // and the tableName that holds each equation's points.
        public void CreateEquationsTable()
        {
            grapherDB.Database.ExecuteSqlRaw(
                    $"CREATE TABLE Equations ("
                        + "Equation NVARCHAR(400) NOT NULL,"
                        + "Table_Name INTEGER IDENTITY(1, 1) NOT NULL," 
                        + "Count INTEGER NOT NULL"
                    + ")"
                );
        }

        [HttpGet("getDatas")]
        public List<EquationData> FindEquationData()
        {
            try
            {
                equationData = grapherDB.Equations.FromSqlRaw(
                        $"SELECT * FROM [Equations]"
                    ).ToList();
            }
            catch { }

            return equationData;
        }

        [HttpGet("clearPoints/{equation}")]
        public void ClearTable(string equation)
        {
            equation = equation.Replace("%2F", "/");
            int tableName = equationData.Find(data => data.Equation == equation)!.Table_Name;

            grapherDB.Database.ExecuteSqlRaw(
                    $"DELETE FROM [{tableName}]"
                );

            UpdateEquationData(equation, 0);
        }
    }
}