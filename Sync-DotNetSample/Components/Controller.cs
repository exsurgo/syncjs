using System;
using System.Collections.Generic;
using System.Collections.Specialized; 
using System.Linq;
using System.Text;
using System.IO;
using System.Web;
using System.Web.Mvc;
using System.Web.UI;
using System.Net.Mail;
using System.Web.Routing;
using System.Dynamic;

namespace Web.Controllers
{
    /// <summary>
    /// Base controller
    /// </summary>
    public abstract class Controller : System.Web.Mvc.Controller
    {
        #region Properties

        public string ActionName
        {
            get { return ValueProvider.GetValue("action").RawValue.ToString(); }
        }

        public string ControllerName
        {
            get { return ValueProvider.GetValue("controller").RawValue.ToString(); }
        }

        public bool IsAjaxRequest
        {
            get
            {
                return Request.IsAjaxRequest() || System.Web.HttpContext.Current.Items.Contains("__IsAjaxRequest");
            }
        }

        public bool IsPost
        {
            get
            {
                return Request.HttpMethod == "POST";
            }
        }

        #endregion

        #region Methods

        protected void RenderPartial(string viewName)
        {
            RenderPartial(viewName, null, null);
        }

        protected void RenderPartial(string viewName, object model)
        {
            RenderPartial(viewName, null, model);
        }

        protected void RenderPartial(string viewName, string viewFolder)
        {
            RenderPartial(viewName, viewFolder, null);
        }

        protected void RenderPartial(string viewName, string viewFolder, object model)
        {
            var partialView = new PartialViewResult();
            partialView.TempData = this.TempData;
            partialView.ViewName = (viewFolder != null ? ("~/Views/" + viewFolder + "/" + viewName + ".cshtml") : viewName);
            partialView.ViewData = this.ViewData;
            partialView.ViewData.Model = model;
            partialView.ExecuteResult(this.ControllerContext);
        }

        protected void RenderAction(string actionName)
        {
            string controllerName = this.ValueProvider.GetValue("Controller").RawValue.ToString();
            RenderAction(actionName, controllerName);
        }

        protected void RenderAction(string actionName, string controllerName)
        {
            RenderAction(actionName, controllerName, null);
        }

        protected void RenderAction(string actionName, object routeValues)
        {
            RenderAction(actionName, null, routeValues);
        }

        protected void RenderAction(string actionName, string controllerName, object routeValues)
        {
            //Get Url
            RouteValueDictionary routes = null;
            if (routeValues != null) routes = new RouteValueDictionary(routeValues);
            else routes = new RouteValueDictionary();
            routes.Add("Action", actionName);
            if (!string.IsNullOrEmpty(controllerName)) routes.Add("Controller", controllerName);
            else routes.Add("Controller", this.ControllerContext.RouteData.Values["Controller"].ToString());
            var url = RouteTable.Routes.GetVirtualPath(this.ControllerContext.RequestContext, routes).VirtualPath;

            //Rewrite path
            System.Web.HttpContext.Current.RewritePath(url, false);
            IHttpHandler httpHandler = new MvcHttpHandler();
            httpHandler.ProcessRequest(System.Web.HttpContext.Current);

            //httpContext.Server.TransferRequest(url, true);
        }

        #endregion

        #region Ajax Helpers

        private string _script = "";

        protected void RunCommand(string name)
        {
            _script += name + "();";
        }

        protected void RunCommand(string name, params object[] @params)
        {
            _script += name + "(";
            if (@params != null)
            {
                foreach (object param in @params)
                {
                    if (param is string || param is char)
                        _script += "\"" + param + "\",";
                    else if (param != null)
                        _script += param.ToString() + ",";
                    else // param == null
                        _script += "null,";
                }
            }
            _script = _script.TrimEnd(',');
            _script += ");";
        }

        protected void RequestUrl(string url)
        {
            RunCommand("Request", url);
        }

        protected void Empty(string selector)
        {
            RunCommand("Empty", selector);
        }

        protected void Text(string selector, string text)
        {
            RunCommand("Text", selector, text);
        }

        protected void Html(string selector, string html)
        {
            RunCommand("Html", selector, html);
        }

        protected void Remove(string selector)
        {
            RunCommand("Remove", selector);
        }

        protected void Show(string selector)
        {
            RunCommand("Show", selector);
        }

        protected void Hide(string selector)
        {
            RunCommand("Hide", selector);
        }

        protected void Prepend(string selector, string html)
        {
            RunCommand("Prepend", selector, html);
        }

        protected void Append(string selector, string html)
        {
            RunCommand("Append", selector, html);
        }

        protected void Attr(string selector)
        {
            RunCommand("Attr", selector);
        }

        #endregion

        #region Results

        protected TransferResult Transfer(string url)
        {
            return new TransferResult(url);
        }

        protected TransferResult Transfer(string action, string controller)
        {
            return new TransferResult(action, controller);
        }
        
        protected TransferResult Transfer(string action, string controller, object values)
        {
            return new TransferResult(action, controller, values);
        }

        #endregion

        #region Overrides

        protected override void Initialize(RequestContext requestContext)
        {
            base.Initialize(requestContext);
            if (Request.IsAjaxRequest()) System.Web.HttpContext.Current.Items["__IsAjaxRequest"] = true;
        }

        protected override void OnResultExecuted(System.Web.Mvc.ResultExecutedContext filterContext)
        {
            base.OnResultExecuted(filterContext);

            //Write script commands to response
            if (IsAjaxRequest && _script != "") Response.Write("<script>" + _script + "</script>");
        }

        #endregion
    } 
}
