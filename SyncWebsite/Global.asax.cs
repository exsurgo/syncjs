using System.Web.Mvc;
using System.Web.Routing;

namespace Web
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            RouteCollection routes = RouteTable.Routes;
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            //Todos
            routes.MapRoute(
                "Todos", // Route name
                "Todos/{action}/{id}", // URL with parameters
                new { controller = "Todos", action = "List", id = UrlParameter.Optional } // Parameter defaults
            );

            //Post
            routes.MapRoute(
                "Post", // Route name
                "Post", // URL with parameters
                new { controller = "App", action = "Post" } // Parameter defaults
            );

            //Default
            routes.MapRoute(
                "Default", // Route name
                "{folder}/{view}/{id}", // URL with parameters
                new { controller = "App", action = "Get", folder = "Main", view = "Index", id = UrlParameter.Optional } // Parameter defaults
            );
        }
    }
}