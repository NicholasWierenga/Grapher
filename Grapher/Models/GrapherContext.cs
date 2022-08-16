using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

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
                optionsBuilder.UseSqlServer("Server=.\\SQLExpress;Database=Grapher;Trusted_Connection=True;");
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Point>(entity =>
            {
                entity.ToTable("Point");

                entity.Property(e => e.Id).HasColumnName("id");

                entity.Property(e => e.Equation)
                    .HasMaxLength(80)
                    .HasColumnName("equation");

                entity.Property(e => e.Xcoord)
                    .HasMaxLength(80)
                    .HasColumnName("xcoord");

                entity.Property(e => e.Ycoord)
                    .HasMaxLength(80)
                    .HasColumnName("ycoord");

                entity.Property(e => e.Zcoord)
                    .HasMaxLength(80)
                    .HasColumnName("zcoord");
            });

            OnModelCreatingPartial(modelBuilder);
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}
