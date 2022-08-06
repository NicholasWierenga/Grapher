This program is most useful when it handles complicated equations like z = sin(sin(x) * csc(y)) + x ^ 2 * tanh(y). An equation like that will take
some time to calculate initially, but the points found will be sent to the database and when the equation is entered again, it'll be much faster.
Equations that are relatively simple won't have much of an increase in speed when ran again and equations like y = 2 are so simple that the 
program will forgo searching or adding points to the database for the equation and instead calculate the graph normally.

Additionally, users are able to change graphing parameters for an equation and the database will still search for points that match those
parameters. Changing the windows of a graph or the amount of steps taken won't mean the user necessarily needs to calculate the whole
graph once more.

Below are the SQL commands that create the needed database, table, and outputs the database connection string to be used in line 26 in GrapherContext.cs.

CREATE DATABASE Grapher;

GO

USE Grapher;

GO

-- Creates our table

CREATE TABLE Point (
    id INTEGER NOT NULL IDENTITY(1, 1) PRIMARY KEY,
    equation NVARCHAR(80) NOT NULL,
    xcoord NVARCHAR(80) NOT NULL,
    ycoord NVARCHAR(80) NOT NULL,
    zcoord NVARCHAR(80)
)

GO

-- Outputs your connection string to be used in the GrapherContext.cs file

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