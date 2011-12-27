using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Routing;

namespace System.Web.Mvc
{
    /// <summary>
    /// Transfers execution to another url or controller action
    /// </summary>
    public class TransferResult : ActionResult
    {
        private string _url;
        private string _Action;
        private string _Controller;
        private object _Values;

        public TransferResult(string url)
        {
            _url = url;
        }

        public TransferResult(string action, string controller)
        {
            _Action = action;
            _Controller = controller;
        }

        public TransferResult(string action, string controller, object values)
        {
            _Action = action;
            _Controller = controller;
            _Values = values;
        }

        public override void ExecuteResult(ControllerContext context)
        {
            //Get url
            string url = "";
            if (!string.IsNullOrEmpty(_url)) url = _url;
            else
            {
                //Create route
                var routeValues = new RouteValueDictionary(_Values);
                routeValues.Add("Action", _Action);
                routeValues.Add("Controller", _Controller);

                //Must persist ajax
                var request = HttpContext.Current.Request;
                if ((request["X-Requested-With"] != null &&
                    request["X-Requested-With"].Equals("XmlHttpRequest", StringComparison.InvariantCultureIgnoreCase)) ||
                    request.QueryString["_"] != null ||
                    context.HttpContext.Items["__IsAjaxRequest"] != null)
                    routeValues.Add("X-Requested-With", "XmlHttpRequest");

                url = RouteTable.Routes.GetVirtualPath(context.RequestContext, routeValues).VirtualPath;
            }

            HttpContext.Current.RewritePath(url, false);
            IHttpHandler httpHandler = new MvcHttpHandler();
            httpHandler.ProcessRequest(HttpContext.Current);

            //httpContext.Server.TransferRequest(url, true);
        }
    }
}