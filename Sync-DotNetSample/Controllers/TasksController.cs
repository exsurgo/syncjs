 using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Web.Controllers
{
    public class TasksController : Controller
    {
        //GET:  /Task/List
        public ActionResult List()
        {
            var tasks = new[]
                        {
                            new { TaskID = 1, Title = "Task 1", Priority = "High" },
                            new { TaskID = 2, Title = "Task 2", Priority = "Normal" },
                            new { TaskID = 3, Title = "Task 2", Priority = "Low" }
                        };

            return Json(tasks, JsonRequestBehavior.AllowGet);
        }

    }
}
