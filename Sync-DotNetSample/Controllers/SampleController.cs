using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;

namespace Web.Controllers
{
    public class SampleController : Controller
    {
        //GET:  /Sample
        public ActionResult Index()
        {
            return View();
        }

        //GET:  /Sample/Show/{view}
        public ActionResult Show(string view)
        {
            return View(view);
        }

        //POST: /Sample/Post
        [HttpPost]
        public ActionResult Post(string name)
        {
            ViewBag.Name = name;
            return View();
        }
    }
}
