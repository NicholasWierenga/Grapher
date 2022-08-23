using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;

namespace Grapher.Models
{
    [Keyless]
    public partial class Point
    {
        public string Xcoord { get; set; } = null!;
        public string Ycoord { get; set; } = null!;
        public string? Zcoord { get; set; }
    }
}
