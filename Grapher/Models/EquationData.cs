using Microsoft.EntityFrameworkCore;

namespace Grapher.Models
{
    [Keyless]
    public class EquationData
    {
        public string Equation { get; set; } = null!;
        public int Table_Name { get; set; }
    }
}
