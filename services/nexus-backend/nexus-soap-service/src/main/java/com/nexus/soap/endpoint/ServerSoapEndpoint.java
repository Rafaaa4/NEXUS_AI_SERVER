package com.nexus.soap.endpoint;

import com.nexus.common.entity.JobEntity;
import com.nexus.common.repository.JobRepository;
import com.nexus.common.repository.ServerRepository;
import org.springframework.ws.server.endpoint.annotation.Endpoint;
import org.springframework.ws.server.endpoint.annotation.PayloadRoot;
import org.springframework.ws.server.endpoint.annotation.RequestPayload;
import org.springframework.ws.server.endpoint.annotation.ResponsePayload;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilderFactory;
import java.time.OffsetDateTime;
import java.util.UUID;

@Endpoint
public class ServerSoapEndpoint {

    private static final String NAMESPACE_URI = "http://nexus.com/soap/servers";

    private final ServerRepository serverRepository;
    private final JobRepository jobRepository;

    public ServerSoapEndpoint(ServerRepository serverRepository, JobRepository jobRepository) {
        this.serverRepository = serverRepository;
        this.jobRepository = jobRepository;
    }

    @PayloadRoot(namespace = NAMESPACE_URI, localPart = "GetServerStatusRequest")
    @ResponsePayload
    public Element getServerStatus(@RequestPayload Element request) throws Exception {
        String serverIdStr = request.getElementsByTagNameNS(NAMESPACE_URI, "serverId").item(0).getTextContent();
        UUID serverId = UUID.fromString(serverIdStr);

        var serverOpt = serverRepository.findById(serverId);

        Document doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();
        Element response = doc.createElementNS(NAMESPACE_URI, "GetServerStatusResponse");

        Element idEl = doc.createElementNS(NAMESPACE_URI, "serverId");
        idEl.setTextContent(serverId.toString());
        response.appendChild(idEl);

        Element nameEl = doc.createElementNS(NAMESPACE_URI, "serverName");
        nameEl.setTextContent(serverOpt.map(s -> s.getName()).orElse("Unknown"));
        response.appendChild(nameEl);

        Element hostEl = doc.createElementNS(NAMESPACE_URI, "hostname");
        hostEl.setTextContent(serverOpt.map(s -> s.getHostname()).orElse(""));
        response.appendChild(hostEl);

        Element statusEl = doc.createElementNS(NAMESPACE_URI, "status");
        statusEl.setTextContent(serverOpt.map(s -> s.getStatus()).orElse("offline"));
        response.appendChild(statusEl);

        Element osEl = doc.createElementNS(NAMESPACE_URI, "os");
        osEl.setTextContent(serverOpt.map(s -> s.getOsName() + " " + s.getOsVersion()).orElse("Linux"));
        response.appendChild(osEl);

        Element lastSeenEl = doc.createElementNS(NAMESPACE_URI, "lastSeen");
        lastSeenEl.setTextContent(OffsetDateTime.now().toString());
        response.appendChild(lastSeenEl);

        return response;
    }

    @PayloadRoot(namespace = NAMESPACE_URI, localPart = "EmergencyLockdownRequest")
    @ResponsePayload
    public Element emergencyLockdown(@RequestPayload Element request) throws Exception {
        String serverIdStr = request.getElementsByTagNameNS(NAMESPACE_URI, "serverId").item(0).getTextContent();
        String reason = request.getElementsByTagNameNS(NAMESPACE_URI, "reason").item(0).getTextContent();
        UUID serverId = UUID.fromString(serverIdStr);

        JobEntity job = new JobEntity();
        job.setOrganizationId(UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f"));
        job.setServerId(serverId);
        job.setJobType("security.lockdown");
        job.setStatus("queued");
        job.setCreatedAt(OffsetDateTime.now());
        jobRepository.save(job);

        Document doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();
        Element response = doc.createElementNS(NAMESPACE_URI, "EmergencyLockdownResponse");

        Element successEl = doc.createElementNS(NAMESPACE_URI, "success");
        successEl.setTextContent("true");
        response.appendChild(successEl);

        Element msgEl = doc.createElementNS(NAMESPACE_URI, "message");
        msgEl.setTextContent("Emergency lockdown initiated. Reason: " + reason);
        response.appendChild(msgEl);

        Element jobEl = doc.createElementNS(NAMESPACE_URI, "jobId");
        jobEl.setTextContent(job.getId().toString());
        response.appendChild(jobEl);

        return response;
    }
}
