using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Internal;

namespace Grapher.Models
{
    public partial class GrapherContext : DbContext
    {
        public GrapherContext()
        {
        }

        public GrapherContext(DbContextOptions<GrapherContext> options)
            : base(options)
        {
        }

        public virtual DbSet<Point> Points { get; set; } = null!;

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see http://go.microsoft.com/fwlink/?LinkId=723263.
                optionsBuilder.UseSqlServer("data source=MSI\\SQLEXPRESS;initial catalog=Grapher;trusted_connection=true");
            }
        }
    }
}