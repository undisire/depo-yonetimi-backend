const { User, Project } = require("../models");
const sequelize = require("../config/database");

// Project::withCount('engineer')->withCount('contractor')->get();

(async () => {
  const projects = await Project.findAll({
    attributes: {
      include: [
        [
          sequelize.literal(`(
                SELECT COUNT(*) 
                FROM project_user AS pu
                WHERE pu.project_id = Project.id AND pu.role = 'engineer'
              )`),
          "engineer_count",
        ],
        [
          sequelize.literal(`(
                SELECT COUNT(*) 
                FROM project_user AS pu
                WHERE pu.project_id = Project.id AND pu.role = 'contractor'
              )`),
          "contractor_count",
        ],
      ],
    },
  });

  projects.forEach((project) => {
    console.log(project.toJSON());
  });

  //   const user = await User.findByPk(1);

  //   const projectCount = await user.countProjects();

  //   console.log("projectCount > ", projectCount);

  //   console.log(user.toJSON());

  sequelize.close();
})();
