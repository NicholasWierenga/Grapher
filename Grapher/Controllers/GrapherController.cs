using Grapher.Models;
using Microsoft.AspNetCore.Mvc;

namespace Grapher.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class GrapherController : Controller
    {
        GrapherContext grapherDB = new GrapherContext();

        [HttpGet("points/{equation}")]
        public List<Point> GetPoints(string equation)
        {
            // equations with / mess with the URL. %2F is the code for /, so fractions are passed to here with %2F.
            return grapherDB.Points.Where(point => point.Equation == equation.Replace("%2F", "/")).ToList();
        }

        [HttpPost("addPoints")]
        public void CreatePoints(List<Point> calculatedPoints)
        {
            grapherDB.Points.AddRange(calculatedPoints);
            grapherDB.SaveChanges();
        }
    }
}
