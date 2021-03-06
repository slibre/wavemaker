/*
 *  Copyright (C) 2007-2013 VMware, Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package com.wavemaker.tools.compiler;

import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import javax.tools.JavaCompiler;
import javax.tools.JavaCompiler.CompilationTask;
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;
import javax.tools.JavaFileObject.Kind;
import javax.tools.StandardJavaFileManager;
import javax.tools.StandardLocation;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.util.StringUtils;

import com.wavemaker.common.WMRuntimeException;
import com.wavemaker.tools.apt.AbstractStudioServiceProcessor;
import com.wavemaker.tools.apt.ServiceConfigurationProcessor;
import com.wavemaker.tools.apt.ServiceDefProcessor;
import com.wavemaker.tools.apt.ServiceProcessorConstants;
import com.wavemaker.tools.io.File;
import com.wavemaker.tools.io.FilterOn;
import com.wavemaker.tools.io.Folder;
import com.wavemaker.tools.io.Resource;
import com.wavemaker.tools.io.ResourceFilter;
import com.wavemaker.tools.io.compiler.ResourceJavaFileManager;
import com.wavemaker.tools.project.Project;
import com.wavemaker.tools.project.ProjectManager;
import com.wavemaker.tools.project.StudioFileSystem;
import com.wavemaker.tools.service.DesignServiceManager;

/**
 * Compiler main class. This class compiles all java class source files in a project and executes annotation processors
 * post-compilation
 * 
 * @author Seung Lee
 * @author Jeremy Grelle
 */
public class ProjectCompiler {

    private final Log logger = LogFactory.getLog(getClass());

    private static final ResourceFilter JAR_FILE_FILTER = FilterOn.names().ending(".jar");

    private static final List<String> RUNTIME_SERVICE_NAMES;

    static {
        ArrayList<String> list = new ArrayList<String>();
        list.add("securityService");
        list.add("runtimeService");
        list.add("waveMakerService");
        RUNTIME_SERVICE_NAMES = Collections.unmodifiableList(list);
    }

    private ProjectManager projectManager;

    private DesignServiceManager designServiceManager;

    private StudioFileSystem fileSystem;

    public String compile() {
        Project project = this.projectManager.getCurrentProject();
        return compile(project);
    }

    public String compile(final Project project) {
        try {
            copyRuntimeServiceFiles(project.getWebAppRootFolder(), project.getClassOutputFolder());
            JavaCompiler compiler = new WaveMakerJavaCompiler();
            StandardJavaFileManager standardFileManager = compiler.getStandardFileManager(null, null, null);
            standardFileManager.setLocation(StandardLocation.CLASS_PATH, getStandardClassPath());
            ResourceJavaFileManager projectFileManager = new ResourceJavaFileManager(standardFileManager);
            projectFileManager.setLocation(StandardLocation.SOURCE_PATH, project.getSourceFolders());
            projectFileManager.setLocation(StandardLocation.CLASS_OUTPUT, Collections.singleton(project.getClassOutputFolder()));
            projectFileManager.setLocation(StandardLocation.CLASS_PATH, getClasspath(project));
            copyResources(project);
            Iterable<JavaFileObject> compilationUnits = projectFileManager.list(StandardLocation.SOURCE_PATH, "", Collections.singleton(Kind.SOURCE),
                true);
            StringWriter compilerOutput = new StringWriter();
            CompilationTask compilationTask = compiler.getTask(compilerOutput, projectFileManager, null, getCompilerOptions(project), null,
                compilationUnits);
            ServiceDefProcessor serviceDefProcessor = configure(new ServiceDefProcessor(), projectFileManager);
            ServiceConfigurationProcessor serviceConfigurationProcessor = configure(new ServiceConfigurationProcessor(), projectFileManager);
            compilationTask.setProcessors(Arrays.asList(serviceConfigurationProcessor, serviceDefProcessor));
            if (!compilationTask.call()) {
                throw new WMRuntimeException("Compile failed with output:\n\n" + compilerOutput.toString());
            }
            return compilerOutput.toString();
        } catch (IOException e) {
            throw new WMRuntimeException("Unable to compile " + project.getProjectName(), e);
        }
    }

    public String compile(Folder webAppRootFolder, Iterable<Folder> sources, Folder destination, Iterable<Resource> classpath) {
        try {
            if (webAppRootFolder != null) {
                copyRuntimeServiceFiles(webAppRootFolder, destination);
            }
            JavaCompiler compiler = new WaveMakerJavaCompiler();
            StandardJavaFileManager standardFileManager = compiler.getStandardFileManager(null, null, null);
            standardFileManager.setLocation(StandardLocation.CLASS_PATH, getStandardClassPath());
            ResourceJavaFileManager projectFileManager = new ResourceJavaFileManager(standardFileManager);
            projectFileManager.setLocation(StandardLocation.SOURCE_PATH, sources);
            ArrayList<Folder> destinations = new ArrayList<Folder>();
            destinations.add(destination);
            projectFileManager.setLocation(StandardLocation.CLASS_OUTPUT, destinations);
            projectFileManager.setLocation(StandardLocation.CLASS_PATH, classpath);
            Iterable<JavaFileObject> compilationUnits = projectFileManager.list(StandardLocation.SOURCE_PATH, "", Collections.singleton(Kind.SOURCE),
                true);
            StringWriter compilerOutput = new StringWriter();
            CompilationTask compilationTask = compiler.getTask(compilerOutput, projectFileManager, null, getCompilerOptions(), null, compilationUnits);
            if (!compilationTask.call()) {
                throw new WMRuntimeException("Compile failed with output:\n\n" + compilerOutput.toString());
            }
            return compilerOutput.toString();
        } catch (IOException e) {
            throw new WMRuntimeException("Compile error: " + e);
        }
    }

    /**
     * Copy all non java resources.
     * 
     * @param project
     */
    private void copyResources(final Project project) {
        for (Folder sourceFolder : project.getSourceFolders()) {
            sourceFolder.find().files().exclude(FilterOn.names().ending(".java")).copyTo(project.getClassOutputFolder());
        }
    }

    /**
     * Copy the runtime services XML files from studio to the project. Service XML files are no long shipped inside the
     * runtime jars.
     * 
     * @param project
     */
    private void copyRuntimeServiceFiles(Folder webAppRootFolder, Folder classOutputFolder) {
        Folder studioWebAppRootFolder = this.fileSystem.getStudioWebAppRootFolder();
        for (String serviceName : RUNTIME_SERVICE_NAMES) {
            File smdFile = studioWebAppRootFolder.getFile("services/" + serviceName + ".smd");
            File springFile = studioWebAppRootFolder.getFile("WEB-INF/classes/" + serviceName + ".spring.xml");
            if (smdFile.exists()) {
                smdFile.copyTo(webAppRootFolder.getFolder("services"));
            }
            if (springFile.exists()) {
                springFile.copyTo(classOutputFolder);
            }
        }
    }

    private Iterable<java.io.File> getStandardClassPath() {
        String catalinaBase = System.getProperty("catalina.base");
        if (!StringUtils.hasLength(catalinaBase)) {
            this.logger.warn("Unable to locate running tomcat instance, servlet-api jar will not be available");
            return null;
        }
        return Collections.singleton(new java.io.File(catalinaBase + "/lib/servlet-api.jar"));
    }

    public Iterable<Resource> getClasspath(Project project) {
        return getClasspath(project.getRootFolder());
    }

    public Iterable<Resource> getClasspath(Folder projectRoot) {
        List<Resource> classpath = new ArrayList<Resource>();
        addAll(classpath, projectRoot.getFolder("lib").list().files().include(JAR_FILE_FILTER));
        addAll(classpath, this.fileSystem.getStudioWebAppRootFolder().getFolder("WEB-INF/lib").list().files().include(JAR_FILE_FILTER));
        return classpath;
    }

    private <T> void addAll(List<T> list, Iterable<? extends T> items) {
        for (T t : items) {
            list.add(t);
        }
    }

    private <T extends AbstractStudioServiceProcessor> T configure(T processor, JavaFileManager javaFileManager) {
        processor.setFileSystem(this.fileSystem);
        processor.setDesignServiceManager(this.designServiceManager);
        processor.setJavaFileManager(javaFileManager);
        return processor;
    }

    private Iterable<String> getCompilerOptions(Project project) {
        List<String> options = new ArrayList<String>();
        options.add("-encoding");
        options.add("utf8");
        options.add("-A" + ServiceProcessorConstants.PROJECT_NAME_PROP + "=" + project.getProjectName());
        options.add("-g");
        options.add("-warn:-serial");
        return options;
    }

    private Iterable<String> getCompilerOptions() {
        List<String> options = new ArrayList<String>();
        options.add("-encoding");
        options.add("utf8");
        options.add("-g");
        options.add("-warn:-serial");
        return options;
    }

    public void setProjectManager(ProjectManager projectManager) {
        this.projectManager = projectManager;
    }

    public void setDesignServiceManager(DesignServiceManager designServiceManager) {
        this.designServiceManager = designServiceManager;
    }

    public void setFileSystem(StudioFileSystem fileSystem) {
        this.fileSystem = fileSystem;
    }
}
