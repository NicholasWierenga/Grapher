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

CREATE TABLE Point ( <br />
    &nbsp;id INTEGER NOT NULL IDENTITY(1, 1) PRIMARY KEY, <br />
    &nbsp;equation NVARCHAR(80) NOT NULL, <br />
    &nbsp;xcoord NVARCHAR(80) NOT NULL, <br />
    &nbsp;ycoord NVARCHAR(80) NOT NULL, <br />
    &nbsp;zcoord NVARCHAR(80) <br />
)

GO

-- Outputs your connection string to be used in the GrapherContext.cs file

select <br />
    &nbsp;'data source=' + @@servername + <br />
    &nbsp;';initial catalog=' + db_name() + <br />
    &nbsp;case type_desc <br />
        &nbsp;&nbsp;when 'WINDOWS_LOGIN'  <br />
            &nbsp;&nbsp;&nbsp;then ';trusted_connection=true' <br />
        &nbsp;&nbsp;else <br />
            &nbsp;&nbsp;&nbsp;';user id=' + suser_name() + ';password=<<YourPassword>>' <br />
    &nbsp;end <br />
    &nbsp;as ConnectionString <br />
from sys.server_principals <br />
where name = suser_name()
