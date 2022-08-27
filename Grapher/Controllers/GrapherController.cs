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
        GrapherContext grapherDB = new();
        List<EquationData> equationData = new List<EquationData>();

        // Returns a list of points for a given equation.
        [HttpGet("points/{equation}")]
        public List<Point> getPoints(string equation)
        {
            int tableName = FindTableName(equation);
            equation = equation.Replace("%2F", "/"); // %2F is URL encoding for /, so we swap it back here.

            if (tableName != -1)
            {
                return grapherDB.Set<Point>().FromSqlRaw(
                        $"SELECT * FROM [{tableName}];").ToList();
            }
            // If tableName is an empty string, that means that there was no record in Equations for equation.
            // We then insert the equation into Equations, find its tableName, then create that table as tableName.
            else
            {
                InsertEquation(equation);

                tableName = FindTableName(equation);

                CreateTable(tableName);

                UpdateEquationData(equation, tableName);

                return new List<Point>();
            }
        }

        // Creates a table in the DB that is used to store points for equation corresponding to tableName.
        // tableName is used instead of the equation for the table's title, because SQL table names can only
        // be up to 128 characters and do not allow most math symbols.
        public void CreateTable(int tableName)
        {
            grapherDB.Database.ExecuteSqlRaw(
                $"CREATE TABLE [{tableName.ToString()}] ( "
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

        public void UpdateEquationData(string equation, int tableName)
        {
            this.equationData.Add(new EquationData { Equation = equation, 
                Table_Name = tableName, Count = 0});
        }

        // Looks through the Equations table for the equation. When that is found, it returns
        // its corresponding tableName.
        public int FindTableName(string equation)
        {
            int tableName = -1;

            try
            {
#pragma warning disable CS8602 // Dereference of a possibly null reference.
                tableName = grapherDB.Set<EquationData>().FromSqlRaw(
                        $"SELECT *, 0 as Count " +
                        $"FROM Equations " +
                        $"WHERE Equation = '{equation}'"
                    ).AsNoTracking().AsSingleQuery().FirstOrDefault().Table_Name;
#pragma warning restore CS8602 // Dereference of a possibly null reference.
            }
            catch { }

            return tableName;
        }

        // TODO: Add this to the count for equationData.
        // Takes the equation, finds its table's name, then dumps the points in there.
        [HttpPost("addPoints/{equation}")]
        public void AddPoints(string equation, List<Point> calculatedPoints)
        {
            int tableName = FindTableName(equation);
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
                    $"INSERT INTO [{tableName.ToString()}] (xcoord, ycoord, zcoord) "
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

        [HttpGet("getDatas")]
        public List<EquationData> FindEquationData()
        {
            List<EquationData> equationDatas = new List<EquationData>();

            try
            {
                equationDatas = grapherDB.Equations.FromSqlRaw(
                        $"SELECT *, 0 AS Count FROM Equations;"
                    ).ToList();
            }
            catch 
            {
                return equationDatas;
            }

            foreach (EquationData equationData in equationDatas)
            {
                equationData.Count = grapherDB.Equations.FromSqlRaw(
                    $"SELECT '0' AS Equation, 0 AS Table_Name, COUNT(*) AS Count FROM [{equationData.Table_Name}]"
                ).First().Count;
            }

            return equationDatas;
        }

        [HttpGet("clearPoints/{tableName}")]
        public void ClearTable(int tableName)
        {
            grapherDB.Database.ExecuteSqlRaw(
                    $"DELETE FROM [{tableName.ToString()}];"
                );
        }
    }
}