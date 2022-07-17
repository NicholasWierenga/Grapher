using Grapher.Models;
using Microsoft.AspNetCore.Mvc;

namespace Grapher.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class GrapherController : Controller
    {
        GrapherContext grapherDB = new GrapherContext();

        [HttpGet("points/{expressionToGraph}")]
        public List<Point> GetPoints(string expressionToGraph)
        {
            return grapherDB.Points.Where(point => point.Equation == expressionToGraph).ToList();
        }

        [HttpPost("addPoints")]
        public void CreatePoints(List<Point> calculatedPoints)
        {
            grapherDB.Points.AddRange(calculatedPoints);
            grapherDB.SaveChanges();
        }
    }
}
