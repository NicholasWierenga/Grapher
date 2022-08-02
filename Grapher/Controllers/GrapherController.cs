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
