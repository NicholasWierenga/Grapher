using Grapher.Models;
using Microsoft.AspNetCore.Mvc;

namespace Grapher.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class GrapherController : Controller
    {
        GrapherContext grapherDB = new GrapherContext();

        // SQL queries, LINQ statements, and typescript searches might pose a runtime issue in the future
        // where there will be massive tables to comb through. If this does occur, we will probably want
        // to change how we store points for each equation. This could look like trying to find a table named
        // the used equation and if it isn't found, create a new one with same coord data requirements as the
        // table we now use. If it is found, return those points, then use typescript to filter the rest based
        // off chart criteria. This could cut down on the runtime a significant amount as compared to now, because
        // we wouldn't be needing the .Where() below to filter through the potentially many equations that we
        // clearly don't want data for. This method would only require the SQL query then the typescript search.
        [HttpGet("points/{equation}")]
        public List<Point> GetPoints(string equation)
        {
            return grapherDB.Points.Where(point => point.Equation == equation).ToList();
        }

        [HttpPost("addPoints")]
        public void CreatePoints(List<Point> calculatedPoints)
        {
            grapherDB.Points.AddRange(calculatedPoints);
            grapherDB.SaveChanges();
        }
    }
}
