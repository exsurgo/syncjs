﻿using System;
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

        //POST: /Post
        public ActionResult Post(string postValue)
        {
            ViewBag.PostValue = postValue;
            System.Threading.Thread.Sleep(1000);
            return View("Basics", "Post");
        }

        //GET:  /Task/List
        public ActionResult Tasks()
        {
            var tasks = new[]
                        {
                            new {TaskID = 1, Title = "Task 1", Priority = "High"},
                            new {TaskID = 2, Title = "Task 2", Priority = "Normal"},
                            new {TaskID = 3, Title = "Task 2", Priority = "Low"}
                        };

            return Json(tasks);
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
