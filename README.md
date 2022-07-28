This application runs equations and puts calculated points into a database, which can be retreived later on to skip unnecessary calculations.
Below is the SQL commands that create the needed database, table, and outputs the database connection string to be used in line 26 in GrapherContext.cs.

CREATE DATABASE Grapher;

GO

USE Grapher;

GO

-- Creates our tables
CREATE TABLE Point (
    id INTEGER NOT NULL IDENTITY(1, 1) PRIMARY KEY,
    equation NVARCHAR(80) NOT NULL,
    xcoord NVARCHAR(80) NOT NULL,
    ycoord NVARCHAR(80) NOT NULL,
    zcoord NVARCHAR(80)
)

GO

-- Outputs your connection string to be used in the GrapherContext.cs folder
select
    'data source=' + @@servername +
    ';initial catalog=' + db_name() +
    case type_desc
        when 'WINDOWS_LOGIN' 
            then ';trusted_connection=true'
        else
            ';user id=' + suser_name() + ';password=<<YourPassword>>'
    end
    as ConnectionString
from sys.server_principals
where name = suser_name()
