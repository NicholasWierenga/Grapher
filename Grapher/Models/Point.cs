using System;
using System.Collections.Generic;

namespace Grapher.Models
{
    public partial class Point
    {
        public int Id { get; set; }
        public string Equation { get; set; } = null!;
        public string Xcoord { get; set; } = null!;
        public string Ycoord { get; set; } = null!;
    }
}
