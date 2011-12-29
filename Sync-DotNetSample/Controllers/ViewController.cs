using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Web.Controllers
{
    public class AppController : Controller
    {
        //GET:  /{Folder}/{View}
        public ActionResult Get(string folder, string view)
        {
            return View(folder, view);
        }

        #region Helpers

        private new ActionResult View(string viewFolder, string viewName, object model = null)
        {
            var view = new ViewResult();
            view.TempData = TempData;
            view.ViewName = (viewFolder != null ? ("~/Views/" + viewFolder + "/" + viewName + ".cshtml") : viewName);
            view.ViewData = ViewData;
            view.ViewData.Model = model;
            view.ExecuteResult(ControllerContext);
            return null;
        }

        #endregion
    }
}
